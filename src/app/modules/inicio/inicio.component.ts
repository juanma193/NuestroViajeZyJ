import { NgFor, NgIf } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { InicioPhotosService } from '../../core/services/inicio-photos.service';
import { ParejasService } from '../../core/services/parejas.service';
import { ToastService } from '../../core/toast/services/toast.service';

type UiPhoto = { id: number | string; src: string; alt: string; caption: string; path: string };

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [NgFor, NgIf],
  templateUrl: './inicio.component.html',
})
export class InicioComponent implements OnInit {
  currentPhotoIndex = 0;

  readonly frases = ['Siempre vos', 'Mi lugar seguro', 'Con vos todo', 'Un día a la vez', 'Nosotros 💖'];
  readonly fraseAleatoria = this.frases[Math.floor(Math.random() * this.frases.length)];

  readonly maxFileSizeMb = 8;
  readonly allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  readonly maxTotalImages = 12;

  isLoadingPhotos = false;
  isUploading = false;

  // ⚡ Para que no se vea feo: placeholders
  readonly skeletonCount = 8;

  inicioPhotos: UiPhoto[] = [];

  // Texto/captions
  readonly captions = [
    'Buenos Aires 🌙',
    'Primer viaje juntos',
    'Verano eterno ☀️',
    'Nuestro rincón',
    'Risas infinitas',
    'Atardecer perfecto',
  ];

  constructor(
    private readonly inicioPhotosService: InicioPhotosService,
    private readonly parejasService: ParejasService,
    private readonly toastService: ToastService,
    private readonly cdr: ChangeDetectorRef,
    private readonly ngZone: NgZone
  ) {}

  async ngOnInit() {
    await this.loadInicioPhotos();
  }

  get currentPhoto(): { src: string; alt: string; caption: string } | undefined {
    return this.inicioPhotos.length ? this.inicioPhotos[this.currentPhotoIndex] : undefined;
  }

  trackByPhotoId = (_: number, p: UiPhoto) => p.id;

  nextPhoto() {
    if (!this.inicioPhotos.length) return;
    this.currentPhotoIndex = (this.currentPhotoIndex + 1) % this.inicioPhotos.length;

    // por si estás zoneless y el click no alcanza en algunos casos raros
    this.cdr.detectChanges();
  }

  prevPhoto() {
    if (!this.inicioPhotos.length) return;
    this.currentPhotoIndex = (this.currentPhotoIndex - 1 + this.inicioPhotos.length) % this.inicioPhotos.length;
    this.cdr.detectChanges();
  }

  private setPhotoSrc(path: string, url: string) {
    const idx = this.inicioPhotos.findIndex((p) => p.path === path);
    if (idx < 0) return;

    // evitar renders si no cambió
    if (this.inicioPhotos[idx].src === url) return;

    this.inicioPhotos[idx].src = url;

    // Si el hero está vacío, aseguramos que muestre la primera cargada
    if (this.currentPhotoIndex < 0 || this.currentPhotoIndex >= this.inicioPhotos.length) {
      this.currentPhotoIndex = 0;
    }

    // Forzar repaint inmediato sin necesidad de interacción
    this.cdr.detectChanges();
  }

  async loadInicioPhotos() {
    this.isLoadingPhotos = true;
    this.cdr.detectChanges();

    try {
      const parejaId = await this.parejasService.getParejaIdActual();

      if (!parejaId) {
        this.inicioPhotos = [];
        this.currentPhotoIndex = 0;
        return;
      }

      const records = await this.inicioPhotosService.listPhotos(parejaId);

      // Pintamos rápido con src vacío (placeholders por tile)
      this.inicioPhotos = records.map((r, index) => ({
        id: r.id,
        path: r.path,
        src: '',
        alt: `Recuerdo ${index + 1}`,
        caption: this.captions[index % this.captions.length],
      }));

      // Render inmediato del grid con placeholders
      this.cdr.detectChanges();

      // Resolver URLs progresivamente y actualizar UI dentro de zona
      await this.inicioPhotosService.hydrateUrlsProgressive(parejaId, this.inicioPhotos, (path, url) => {
        // Esto asegura que Angular se entere aunque sea zoneless / fuera de la zona
        this.ngZone.run(() => this.setPhotoSrc(path, url));
      });

      // Ajuste índice si quedó fuera
      if (this.currentPhotoIndex >= this.inicioPhotos.length) this.currentPhotoIndex = 0;
    } finally {
      this.isLoadingPhotos = false;

      // Asegura que desaparezca el loading aunque no haya eventos de usuario
      this.ngZone.run(() => this.cdr.detectChanges());
    }
  }

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';

    if (!files.length) return;

    const availableSlots = this.maxTotalImages - this.inicioPhotos.length;
    if (availableSlots <= 0) {
      this.toastService.showWarning('Límite alcanzado', `Máximo ${this.maxTotalImages} fotos.`);
      return;
    }

    const filesToUpload = files.slice(0, availableSlots);

    if (files.length > availableSlots) {
      this.toastService.showWarning('Límite alcanzado', `Solo se subirán ${availableSlots} fotos.`);
    }

    await this.uploadInicioPhotos(filesToUpload);
  }

  private validateFile(file: File): string | null {
    const sizeMb = file.size / 1024 / 1024;
    if (sizeMb > this.maxFileSizeMb) return `Archivo muy grande (máx ${this.maxFileSizeMb}MB).`;
    if (file.type && !this.allowedTypes.includes(file.type)) return 'Formato no permitido. Usa JPG, PNG o WEBP.';
    return null;
  }

  async uploadInicioPhotos(files: File[]) {
    if (!files.length) return;

    const parejaId = await this.parejasService.getParejaIdActual();
    if (!parejaId) {
      this.toastService.showError('Error', 'No se encontró la pareja actual.');
      return;
    }

    this.isUploading = true;
    this.ngZone.run(() => this.cdr.detectChanges());

    let uploadedCount = 0;

    try {
      for (const file of files) {
        const error = this.validateFile(file);
        if (error) {
          this.toastService.showWarning('No se pudo subir', error);
          continue;
        }

        const result = await this.inicioPhotosService.uploadPhoto(parejaId, file);
        if (!result.path) {
          this.toastService.showError('Error', result.error ?? 'No se pudo subir la foto.');
          continue;
        }

        uploadedCount += 1;
      }

      if (uploadedCount > 0) {
        this.toastService.showSuccess('Éxito', `${uploadedCount} foto(s) subida(s) correctamente.`);
        await this.loadInicioPhotos();
      }
    } finally {
      this.isUploading = false;
      this.ngZone.run(() => this.cdr.detectChanges());
    }
  }
}
