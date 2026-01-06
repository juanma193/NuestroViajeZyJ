import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-viajes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './viajes.component.html',
  styleUrl: './viajes.component.css'
})
export class ViajesComponent {
  viajes = [
    {
      id: 1,
      titulo: 'Viaje a París',
      fecha: '15-20 Marzo 2026',
      descripcion: 'Un viaje romántico por la ciudad del amor',
      imagen: 'assets/paris.jpg',
      completado: false
    },
    {
      id: 2,
      titulo: 'Playa en Cancún',
      fecha: '10-17 Julio 2026',
      descripcion: 'Descanso en el caribe mexicano',
      imagen: 'assets/cancun.jpg',
      completado: false
    },
    {
      id: 3,
      titulo: 'Aventura en Japón',
      fecha: '1-15 Octubre 2026',
      descripcion: 'Cultura, templos y comida deliciosa',
      imagen: 'assets/japon.jpg',
      completado: false
    }
  ];

  agregarViaje() {
    const nuevoViaje = {
      id: this.viajes.length + 1,
      titulo: 'Nuevo Viaje',
      fecha: 'Por definir',
      descripcion: 'Edita los detalles del viaje',
      imagen: 'assets/default.jpg',
      completado: false
    };
    this.viajes.push(nuevoViaje);
  }

  eliminarViaje(id: number) {
    this.viajes = this.viajes.filter(v => v.id !== id);
  }

  toggleCompletado(viaje: any) {
    viaje.completado = !viaje.completado;
  }
}
