-- Create orders table (replacing transactions concept with full order management)
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  order_name TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  received_date DATE NOT NULL DEFAULT CURRENT_DATE,
  delivery_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'não iniciado' CHECK (status IN ('não iniciado', 'em andamento', 'concluído')),
  paid BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Create policies for orders
CREATE POLICY "Users can view their own orders" 
ON public.orders 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own orders" 
ON public.orders 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own orders" 
ON public.orders 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own orders" 
ON public.orders 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate existing transactions data to orders if any exists
INSERT INTO public.orders (id, user_id, service_id, order_name, customer_name, amount, received_date, delivery_date, status, paid, created_at, updated_at)
SELECT 
  id,
  user_id,
  service_id,
  COALESCE(description, 'Encomenda migrada') as order_name,
  'Cliente não especificado' as customer_name,
  amount,
  date as received_date,
  date + INTERVAL '7 days' as delivery_date,
  'concluído' as status,
  CASE WHEN type = 'income' THEN true ELSE false END as paid,
  created_at,
  updated_at
FROM public.transactions
WHERE NOT EXISTS (SELECT 1 FROM public.orders WHERE orders.id = transactions.id);

-- Drop old transactions table
DROP TABLE IF EXISTS public.transactions;