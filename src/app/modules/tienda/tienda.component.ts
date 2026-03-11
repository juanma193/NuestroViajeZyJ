import { Component } from '@angular/core';

@Component({
  selector: 'app-tienda',
  standalone: true,
  templateUrl: './tienda.component.html',
})
export class TiendaComponent {
  private readonly tiendaUrl = 'https://nuestroviaje.mitiendanube.com/';

  abrirTiendaExterna(): void {
    window.open(this.tiendaUrl, '_blank', 'noopener,noreferrer');
  }
}
