ALTER TABLE public.job_tickets
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

UPDATE public.job_tickets SET
  latitude = CASE lower(district)
    WHEN 'colombo' THEN 6.9271
    WHEN 'kandy' THEN 7.2906
    WHEN 'anuradhapura' THEN 8.3114
    WHEN 'galle' THEN 6.0535
    WHEN 'jaffna' THEN 9.6615
    WHEN 'negombo' THEN 7.2083
    ELSE 7.8731 END,
  longitude = CASE lower(district)
    WHEN 'colombo' THEN 79.8612
    WHEN 'kandy' THEN 80.6337
    WHEN 'anuradhapura' THEN 80.4037
    WHEN 'galle' THEN 80.2210
    WHEN 'jaffna' THEN 80.0255
    WHEN 'negombo' THEN 79.8358
    ELSE 80.7718 END
WHERE latitude IS NULL OR longitude IS NULL;