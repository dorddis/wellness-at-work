-- Migration 005: Protect billing columns from client-side updates
-- Only the service role (used by webhook handler) should modify billing columns.
-- Authenticated users (even admins) should not be able to directly UPDATE these.

CREATE OR REPLACE FUNCTION public.protect_billing_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- Service role bypasses RLS entirely, so this trigger only fires for
  -- authenticated users using the anon/authenticated key.
  -- If any billing column changed, block the update.
  IF (
    OLD.subscription_status IS DISTINCT FROM NEW.subscription_status OR
    OLD.creem_customer_id IS DISTINCT FROM NEW.creem_customer_id OR
    OLD.creem_subscription_id IS DISTINCT FROM NEW.creem_subscription_id OR
    OLD.billing_email IS DISTINCT FROM NEW.billing_email OR
    OLD.current_period_end IS DISTINCT FROM NEW.current_period_end OR
    OLD.trial_ends_at IS DISTINCT FROM NEW.trial_ends_at OR
    OLD.seat_limit IS DISTINCT FROM NEW.seat_limit
  ) THEN
    -- Allow if caller is the service role (current_setting returns 'service_role' for service key)
    IF current_setting('request.jwt.claims', true)::json->>'role' = 'service_role' THEN
      RETURN NEW;
    END IF;

    -- Block the billing column modification for non-service-role callers
    RAISE EXCEPTION 'Billing columns can only be modified by the server. Use the billing page to manage your subscription.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER protect_billing_columns_trigger
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_billing_columns();
