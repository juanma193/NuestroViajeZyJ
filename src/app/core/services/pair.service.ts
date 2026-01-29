import { Injectable } from '@angular/core';
import { SupabaseService } from '../supabase';
import { ParejasService } from './parejas.service';

@Injectable({
  providedIn: 'root',
})
export class PairService extends ParejasService {
  constructor(supabase: SupabaseService) {
    super(supabase);
  }
}
