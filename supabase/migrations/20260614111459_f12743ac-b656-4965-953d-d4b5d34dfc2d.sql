
CREATE OR REPLACE FUNCTION public.are_connected(a uuid, b uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.connections
    WHERE user_a = LEAST(a,b) AND user_b = GREATEST(a,b)
  );
$function$;

ALTER PUBLICATION supabase_realtime DROP TABLE public.connection_invites;
