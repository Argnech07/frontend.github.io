import {
  ChangeDetectionStrategy,
  Component,
  computed,
  EventEmitter,
  inject,
  Input,
  Output,
  signal,
} from '@angular/core';
import { Cie10Diagnosis } from '../../../models/cie10.model';
import { Cie10Service } from '../../../services/cie10.service';

@Component({
  selector: 'diagnostic',
  imports: [],
  templateUrl: './diagnostic.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiagnosticComponent {
  @Input({ required: true }) visitId!: number; // solo informativo ahora
  @Output() diagnosisChange = new EventEmitter<{
    primary: string | null;
    secondary: string[];
  }>();

  private cie10Api = inject(Cie10Service);

  cieList = signal<Cie10Diagnosis[]>([]);
  primarySearch = signal('');
  secondarySearch = signal('');

  cie10Loading = signal(false);
  cie10LoadError = signal<string | null>(null);

  primaryCode = signal<string | null>(null);
  secondaryCodes = signal<string[]>([]);

  diagnosesCount = computed(
    () => (this.primaryCode() ? 1 : 0) + this.secondaryCodes().length
  );

  ngOnInit() {
    this.cie10Loading.set(true);
    this.cie10LoadError.set(null);
    this.cie10Api.listAll(0, 5000).subscribe({
      next: (list) => {
        this.cieList.set(list);
        this.cie10Loading.set(false);
        console.log('[DiagnosticComponent] CIE10 cargado:', list.length);
      },
      error: (err) => {
        this.cie10Loading.set(false);
        const msg =
          (err && (err.message || err.statusText)) || 'Error cargando CIE10';
        this.cie10LoadError.set(String(msg));
        console.error('[DiagnosticComponent] Error cargando CIE10:', err);
      },
    });
  }

  get filteredPrimaryList(): Cie10Diagnosis[] {
    const term = this.primarySearch().toLowerCase().trim();
    if (!term) return []; // <-- no mostrar nada si input vacío
    return this.cieList().filter(
      (d) =>
        d.code.toLowerCase().includes(term) ||
        d.description.toLowerCase().includes(term)
    );
  }

  get filteredSecondaryList(): Cie10Diagnosis[] {
    const term = this.secondarySearch().toLowerCase().trim();
    if (!term) return []; // <-- no mostrar nada si input vacío
    const primaryCode = this.primaryCode();
    return this.cieList().filter(
      (d) =>
        // Excluir el diagnóstico principal de la lista secundaria
        d.code !== primaryCode &&
        (d.code.toLowerCase().includes(term) ||
          d.description.toLowerCase().includes(term))
    );
  }

  addPrimaryFromInput(): void {
    const term = this.primarySearch().trim();
    if (!term) return;

    console.log('[DiagnosticComponent] addPrimaryFromInput term:', term);
    console.log(
      '[DiagnosticComponent] cieList length:',
      this.cieList().length,
      'filteredPrimaryList length:',
      this.filteredPrimaryList.length
    );

    const exact = this.cieList().find(
      (d) => d.code.toLowerCase() === term.toLowerCase()
    );
    if (exact) {
      console.log('[DiagnosticComponent] primary exact match:', exact.code);
      this.selectPrimary(exact.code);
      return;
    }

    const first = this.filteredPrimaryList[0];
    if (first) {
      console.log('[DiagnosticComponent] primary first suggestion:', first.code);
      this.selectPrimary(first.code);
      return;
    }

    // Permitir texto libre aunque no exista en el catálogo CIE-10
    console.warn('[DiagnosticComponent] primary no match found, using free-text:', term);
    this.selectPrimary(term);
  }

  addSecondaryFromInput(): void {
    const term = this.secondarySearch().trim();
    if (!term) return;

    console.log('[DiagnosticComponent] addSecondaryFromInput term:', term);
    console.log(
      '[DiagnosticComponent] cieList length:',
      this.cieList().length,
      'filteredSecondaryList length:',
      this.filteredSecondaryList.length
    );

    const exact = this.cieList().find(
      (d) => d.code.toLowerCase() === term.toLowerCase()
    );
    if (exact) {
      console.log('[DiagnosticComponent] secondary exact match:', exact.code);
      this.selectSecondary(exact.code);
      return;
    }

    const first = this.filteredSecondaryList[0];
    if (first) {
      console.log(
        '[DiagnosticComponent] secondary first suggestion:',
        first.code
      );
      this.selectSecondary(first.code);
      return;
    }

    // Permitir texto libre aunque no exista en el catálogo CIE-10
    console.warn('[DiagnosticComponent] secondary no match found, using free-text:', term);
    this.selectSecondary(term);
  }

  selectPrimary(code: string) {
    // Si el código ya está en los secundarios, removerlo
    const secondaryList = this.secondaryCodes();
    const filteredSecondary = secondaryList.filter((c) => c !== code);
    this.secondaryCodes.set(filteredSecondary);

    this.primaryCode.set(code);
    this.primarySearch.set('');
    this.emitChange();
  }

  selectSecondary(code: string) {
    const list = this.secondaryCodes();
    const primaryCode = this.primaryCode();

    // No permitir agregar el diagnóstico principal como secundario
    if (code === primaryCode) {
      return;
    }

    // No permitir agregar duplicados
    if (!list.includes(code)) {
      this.secondaryCodes.set([...list, code]);
      this.secondarySearch.set('');
      this.emitChange();
    }
  }

  removePrimary() {
    this.primaryCode.set(null);
    this.emitChange();
  }

  removeSecondary(code: string) {
    this.secondaryCodes.set(
      this.secondaryCodes().filter((c: string) => c !== code)
    );
    this.emitChange();
  }

  private emitChange() {
    this.diagnosisChange.emit({
      primary: this.primaryCode(),
      secondary: this.secondaryCodes(),
    });
  }
}
