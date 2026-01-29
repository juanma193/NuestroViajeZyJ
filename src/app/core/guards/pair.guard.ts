import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from '../supabase';
import { PairService } from '../services/pair.service';

export const pairGuard: CanActivateFn = async () => {
  const supabase = inject(SupabaseService).supabase;
  const router = inject(Router);
  const pairService = inject(PairService);

  const { data } = await supabase.auth.getSession();
  if (!data.session?.user) {
    await router.navigate(['/login']);
    return false;
  }

  const parejaId = await pairService.getMyPair();
  if (parejaId) {
    pairService.setParejaId(parejaId);
    return true;
  }

  await router.navigate(['/onboarding-pareja']);
  return false;
};
