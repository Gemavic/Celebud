// src/hooks/usePermissions.ts
// Fine-grained permission flags layered on top of the simple is_admin
// flag, backed by the `user_roles` table. Anyone WITHOUT a row in
// user_roles keeps full legacy admin access (unrestricted) so existing
// staff are never locked out by this system; a row only ever narrows
// access for the specific person it belongs to (e.g. Admin 2).
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export interface RolePermissions {
  roleLabel: string | null;
  isCeo: boolean;
  isChiefAdmin: boolean;
  canOnboard: boolean;
  canApprovePayments: boolean;
  canApportionArticles: boolean;
  canEditEditorial: boolean;
  canExecutive: boolean;
  loaded: boolean;
}

const FULL_ACCESS: Omit<RolePermissions, 'loaded'> = {
  roleLabel: null,
  isCeo: false,
  isChiefAdmin: false,
  canOnboard: true,
  canApprovePayments: true,
  canApportionArticles: true,
  canEditEditorial: true,
  canExecutive: true,
};

export function usePermissions(): RolePermissions {
  const { user, profile } = useAuth();
  const [perms, setPerms] = useState<RolePermissions>({ ...FULL_ACCESS, loaded: false });

  useEffect(() => {
    let cancelled = false;

    if (!user || !profile?.is_admin) {
      setPerms({ ...FULL_ACCESS, loaded: true });
      return;
    }

    (async () => {
      const { data } = await supabase
        .from('user_roles')
        .select(
          'role_label, is_ceo, is_chief_admin, can_onboard, can_approve_payments, can_apportion_articles, can_edit_editorial, can_executive'
        )
        .eq('user_id', user.id)
        .maybeSingle();

      if (cancelled) return;

      if (!data) {
        // No row = legacy unrestricted admin (unchanged behavior).
        setPerms({ ...FULL_ACCESS, loaded: true });
        return;
      }

      setPerms({
        roleLabel: data.role_label,
        isCeo: data.is_ceo,
        isChiefAdmin: data.is_chief_admin,
        canOnboard: data.can_onboard,
        canApprovePayments: data.can_approve_payments,
        canApportionArticles: data.can_apportion_articles,
        canEditEditorial: data.can_edit_editorial,
        canExecutive: data.can_executive,
        loaded: true,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [user, profile]);

  return perms;
}
