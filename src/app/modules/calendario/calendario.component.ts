import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-calendario',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './calendario.component.html',
  styleUrl: './calendario.component.css'
})
export class CalendarioComponent {
  mesActual = new Date();
  eventos = [
    {
      id: 1,
      fecha: '2026-01-15',
      titulo: 'Aniversario',
      descripcion: 'Nuestro día especial',
      tipo: 'importante'
    },
    {
      id: 2,
      fecha: '2026-02-14',
      titulo: 'San Valentín',
      descripcion: 'Cena romántica',
      tipo: 'especial'
    },
    {
      id: 3,
      fecha: '2026-03-20',
      titulo: 'Viaje a París',
      descripcion: 'Inicio del viaje',
      tipo: 'viaje'
    }
  ];

  get nombreMes(): string {
    return this.mesActual.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  }

  mesAnterior() {
    this.mesActual = new Date(this.mesActual.getFullYear(), this.mesActual.getMonth() - 1, 1);
  }

  mesSiguiente() {
    this.mesActual = new Date(this.mesActual.getFullYear(), this.mesActual.getMonth() + 1, 1);
  }

  agregarEvento() {
    const nuevoEvento = {
      id: this.eventos.length + 1,
      fecha: new Date().toISOString().split('T')[0],
      titulo: 'Nuevo Evento',
      descripcion: 'Edita los detalles',
      tipo: 'normal'
    };
    this.eventos.push(nuevoEvento);
    this.eventos.sort((a, b) => a.fecha.localeCompare(b.fecha));
  }

  eliminarEvento(id: number) {
    this.eventos = this.eventos.filter(e => e.id !== id);
  }

  getEventosPorMes() {
    const mes = this.mesActual.getMonth() + 1;
    const año = this.mesActual.getFullYear();
    return this.eventos.filter(e => {
      const fechaEvento = new Date(e.fecha);
      return fechaEvento.getMonth() + 1 === mes && fechaEvento.getFullYear() === año;
    });
  }
}
