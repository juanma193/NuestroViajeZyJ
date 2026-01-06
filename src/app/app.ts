import { Component, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { SupabaseService } from './core/supabase';
import { ToastContainerComponent } from './core/toast/components/container/toast-container.component';

@Component({
  standalone: true,
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ToastContainerComponent],
  templateUrl: './app.html',
})
export class App implements OnInit {
  readonly title = 'Nuestro diario';

  constructor(private sb: SupabaseService) {}

  async ngOnInit() {
    const { data, error } = await this.sb.supabase.auth.getSession();
    console.log('session:', data?.session);
    console.log('error:', error);
  }
}
