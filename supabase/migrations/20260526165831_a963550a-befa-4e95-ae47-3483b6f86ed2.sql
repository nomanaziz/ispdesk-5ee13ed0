
INSERT INTO public.zkteco_devices (name, connection_type, ip_address, port, comm_key, location, status)
SELECT 'Live Test Device', 'tcp_ip', '103.147.107.110', 4370, 1895, 'Remote', 'active'
WHERE NOT EXISTS (SELECT 1 FROM public.zkteco_devices WHERE ip_address='103.147.107.110');
