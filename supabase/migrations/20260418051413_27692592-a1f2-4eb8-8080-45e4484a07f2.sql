INSERT INTO public.system_settings (setting_key, setting_value)
VALUES (
  'payment_gateways',
  '[
    {"name":"bKash Personal","category":"mobile_personal","type":"Mobile Banking (Personal)","active":false,"show_on_website":true,"color":"#E2136E","fields":{"number":"","holder_name":"","instructions":"Send Money করুন এবং Transaction ID দিন"}},
    {"name":"bKash Merchant","category":"mobile_merchant","type":"Mobile Banking (Merchant)","active":false,"show_on_website":false,"color":"#E2136E","fields":{"merchant_number":"","app_key":"","app_secret":"","username":"","password":""}},
    {"name":"Nagad Personal","category":"mobile_personal","type":"Mobile Banking (Personal)","active":false,"show_on_website":true,"color":"#F6921E","fields":{"number":"","holder_name":"","instructions":"Send Money করুন এবং Transaction ID দিন"}},
    {"name":"Nagad Merchant","category":"mobile_merchant","type":"Mobile Banking (Merchant)","active":false,"show_on_website":false,"color":"#F6921E","fields":{"merchant_id":"","merchant_number":"","public_key":"","private_key":""}},
    {"name":"Rocket Personal","category":"mobile_personal","type":"Mobile Banking (Personal)","active":false,"show_on_website":true,"color":"#8B2F8B","fields":{"number":"","holder_name":"","instructions":"Send Money করুন এবং Transaction ID দিন"}},
    {"name":"Bank Transfer","category":"bank","type":"Bank","active":false,"show_on_website":true,"color":"#1E88E5","fields":{"bank_name":"","account_name":"","account_number":"","branch":"","routing_number":"","address":""}},
    {"name":"SSLCommerz","category":"gateway","type":"Payment Gateway","active":false,"show_on_website":false,"color":"#2E7D32","fields":{"store_id":"","store_password":"","sandbox":"true"}},
    {"name":"RechargeServer","category":"gateway","type":"Payment Gateway","active":false,"show_on_website":true,"color":"#6366F1","fields":{"api_key":"","secret_key":"","brand_key":"","account":""}}
  ]'::jsonb
)
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;