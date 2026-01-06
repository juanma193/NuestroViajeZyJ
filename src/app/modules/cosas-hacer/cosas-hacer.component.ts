import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-cosas-hacer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cosas-hacer.component.html',
})
export class CosasHacerComponent {
  tareas = [
    {
      id: 1,
      titulo: 'Renovar pasaportes',
      categoria: 'Documentos',
      prioridad: 'alta',
      completada: false
    },
    {
      id: 2,
      titulo: 'Reservar hotel en París',
      categoria: 'Viajes',
      prioridad: 'alta',
      completada: false
    },
    {
      id: 3,
      titulo: 'Comprar cámara nueva',
      categoria: 'Compras',
      prioridad: 'media',
      completada: false
    },
    {
      id: 4,
      titulo: 'Aprender frases en francés',
      categoria: 'Aprendizaje',
      prioridad: 'baja',
      completada: false
    }
  ];

  categorias = ['Todas', 'Viajes', 'Documentos', 'Compras', 'Aprendizaje', 'Otros'];
  categoriaSeleccionada = 'Todas';

  get tareasFiltradas() {
    if (this.categoriaSeleccionada === 'Todas') {
      return this.tareas;
    }
    return this.tareas.filter(t => t.categoria === this.categoriaSeleccionada);
  }

  get tareasCompletadas() {
    return this.tareas.filter(t => t.completada).length;
  }

  get tareasPendientes() {
    return this.tareas.filter(t => !t.completada).length;
  }

  agregarTarea() {
    const nuevaTarea = {
      id: this.tareas.length + 1,
      titulo: 'Nueva tarea',
      categoria: 'Otros',
      prioridad: 'media',
      completada: false
    };
    this.tareas.push(nuevaTarea);
  }

  toggleCompletada(tarea: any) {
    tarea.completada = !tarea.completada;
  }

  eliminarTarea(id: number) {
    this.tareas = this.tareas.filter(t => t.id !== id);
  }

  cambiarCategoria(categoria: string) {
    this.categoriaSeleccionada = categoria;
  }
}
