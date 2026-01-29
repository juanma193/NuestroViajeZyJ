import { Injectable } from '@angular/core';
import { BehaviorSubject, map } from 'rxjs';
import { SupabaseService } from '../supabase';
import type { Session, User } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly sessionSubject = new BehaviorSubject<Session | null>(null);
  readonly session$ = this.sessionSubject.asObservable();
  readonly user$ = this.session$.pipe(map((session) => session?.user ?? null));

  constructor(private supabaseService: SupabaseService) {
    this.init();
  }

  private async init() {
    const { data } = await this.supabaseService.supabase.auth.getSession();
    this.sessionSubject.next(data.session ?? null);

    this.supabaseService.supabase.auth.onAuthStateChange((_event, session) => {
      this.sessionSubject.next(session);
    });
  }

  get currentUser(): User | null {
    return this.sessionSubject.value?.user ?? null;
  }

  async getUser(): Promise<User | null> {
    const { data, error } = await this.supabaseService.supabase.auth.getUser();
    if (error) {
      console.error('Error obteniendo usuario:', error);
      return null;
    }
    return data.user ?? null;
  }

  async signInWithGoogle(redirectTo: string) {
    return this.supabaseService.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
  }

  async signOut() {
    await this.supabaseService.supabase.auth.signOut();
  }
}
