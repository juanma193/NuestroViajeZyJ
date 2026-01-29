import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from '../supabase';

export const authGuard: CanActivateFn = async () => {
  const supabase = inject(SupabaseService).supabase;
  const router = inject(Router);
  const { data } = await supabase.auth.getSession();

  if (data.session?.user) {
    return true;
  }

  await router.navigate(['/login']);
  return false;
};
