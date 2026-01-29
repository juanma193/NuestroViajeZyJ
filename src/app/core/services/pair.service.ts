import { Injectable } from '@angular/core';
import { SupabaseService } from '../supabase';
import { AuthService } from './auth.service';
import { ParejasService } from './parejas.service';

@Injectable({
  providedIn: 'root',
})
export class PairService extends ParejasService {
  constructor(supabase: SupabaseService, authService: AuthService) {
    super(supabase, authService);
  }
}
