import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-lugares',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './lugares.component.html',
})
export class LugaresComponent {
  lugares = [
    {
      id: 1,
      nombre: 'Torre Eiffel',
      ciudad: 'París',
      pais: 'Francia',
      descripcion: 'El icono más famoso de París',
      visitado: false,
      tipo: 'monumento'
    },
    {
      id: 2,
      nombre: 'Playa del Carmen',
      ciudad: 'Cancún',
      pais: 'México',
      descripcion: 'Playas paradisíacas del caribe',
      visitado: false,
      tipo: 'playa'
    },
    {
      id: 3,
      nombre: 'Templo Senso-ji',
      ciudad: 'Tokio',
      pais: 'Japón',
      descripcion: 'Templo budista más antiguo de Tokio',
      visitado: false,
      tipo: 'templo'
    },
    {
      id: 4,
      nombre: 'Santorini',
      ciudad: 'Santorini',
      pais: 'Grecia',
      descripcion: 'Atardeceres mágicos y casas blancas',
      visitado: false,
      tipo: 'isla'
    }
  ];

  tipos = ['Todos', 'monumento', 'playa', 'templo', 'isla', 'ciudad', 'naturaleza'];
  tipoSeleccionado = 'Todos';

  get lugaresFiltrados() {
    if (this.tipoSeleccionado === 'Todos') {
      return this.lugares;
    }
    return this.lugares.filter(l => l.tipo === this.tipoSeleccionado);
  }

  get lugaresVisitados() {
    return this.lugares.filter(l => l.visitado).length;
  }

  get lugaresPendientes() {
    return this.lugares.filter(l => !l.visitado).length;
  }

  agregarLugar() {
    const nuevoLugar = {
      id: this.lugares.length + 1,
      nombre: 'Nuevo Lugar',
      ciudad: 'Ciudad',
      pais: 'País',
      descripcion: 'Edita los detalles del lugar',
      visitado: false,
      tipo: 'ciudad'
    };
    this.lugares.push(nuevoLugar);
  }

  toggleVisitado(lugar: any) {
    lugar.visitado = !lugar.visitado;
  }

  eliminarLugar(id: number) {
    this.lugares = this.lugares.filter(l => l.id !== id);
  }

  cambiarTipo(tipo: string) {
    this.tipoSeleccionado = tipo;
  }
}
