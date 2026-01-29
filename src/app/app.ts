import { Component, OnInit, OnDestroy, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  Router,
  RouterOutlet,
  RouterLink,
  RouterLinkActive,
  NavigationEnd,
} from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { SupabaseService } from './core/supabase';
import { AuthService } from './core/services/auth.service';
import { ToastContainerComponent } from './core/toast/components/container/toast-container.component';

@Component({
  standalone: true,
  selector: 'app-root',
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    ToastContainerComponent,
  ],
  templateUrl: './app.html',
})
export class App implements OnInit, OnDestroy {
  readonly title = 'Nuestro diario';

  menuOpen = false;
  isAuthed = false;
  userEmail = '';
  mostrarNavbar = true;

  private authSub?: Subscription;
  private navEndSub?: Subscription;

  constructor(
    private sb: SupabaseService,
    private authService: AuthService,
    private router: Router,
    private zone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    const { data, error } = await this.sb.supabase.auth.getSession();
    console.log('session:', data?.session);
    console.log('error:', error);

    this.authSub = this.authService.user$.subscribe((user) => {
      // esto suele venir fuera de zone en algunas integraciones
      this.zone.run(() => {
        this.isAuthed = !!user;
        this.userEmail = user?.email ?? '';
        this.cdr.detectChanges();
      });
    });

    // Inicial
    this.zone.run(() => {
      this.updateNavbarVisibility(this.router.url);
      this.cdr.detectChanges();
    });

    // En cada navegación
    this.navEndSub = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event) => {
        const nav = event as NavigationEnd;
        const url = nav.urlAfterRedirects || nav.url;

        this.zone.run(() => {
          this.updateNavbarVisibility(url);
          this.cdr.detectChanges();
        });
      });
  }

  ngOnDestroy(): void {
    this.authSub?.unsubscribe();
    this.navEndSub?.unsubscribe();
  }

  private updateNavbarVisibility(rawUrl: string) {
    // Limpio query/hash para que /login?x=1 o /login#... sigan funcionando
    const url = (rawUrl || '').split('?')[0].split('#')[0];

    const isLogin = url === '/login' || url.startsWith('/login/');

    this.mostrarNavbar = !isLogin;

    if (isLogin) {
      this.menuOpen = false;
    }

    // Debug (podés borrarlo después)
    console.log('[NAV]', { rawUrl, url, mostrarNavbar: this.mostrarNavbar });
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu() {
    this.menuOpen = false;
  }

  async logout() {
    await this.authService.signOut();
    this.closeMenu();
  }
}
