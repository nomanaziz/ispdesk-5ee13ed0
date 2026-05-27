## সমস্যা
`requisitions` table-এ `requisition_no` column NOT NULL কিন্তু default নাই। Employee form এটা পাঠায় না, তাই insert fail করে।

## সমাধান
DB trigger দিয়ে `requisition_no` auto-generate করা — insert-এর সময় null হলে format `REQ-YYYYMMDD-XXXX` (random 4-digit) সেট হবে। Frontend-এ কোন change লাগবে না।

### Migration
```sql
CREATE OR REPLACE FUNCTION public.set_requisition_no()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.requisition_no IS NULL OR NEW.requisition_no = '' THEN
    NEW.requisition_no := 'REQ-' || to_char(now(),'YYYYMMDD') || '-' || lpad((floor(random()*10000))::int::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_requisition_no
BEFORE INSERT ON public.requisitions
FOR EACH ROW EXECUTE FUNCTION public.set_requisition_no();
```

এটাই যথেষ্ট — existing data ও admin-side procurement requisitions দুটোই কাজ করবে।