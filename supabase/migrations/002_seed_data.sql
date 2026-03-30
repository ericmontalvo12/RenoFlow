-- ============================================================
-- Seed Data: Stage Templates
-- ============================================================
-- Default remodel workflow stages
-- delivery_required = true where materials need to be dropped off

insert into public.stage_templates (name, trade_type, sort_order, is_active, default_delivery_required) values
  ('Demo',             'demo',        1,  true, false),
  ('Plumbing Rough',   'plumbing',    2,  true, true),
  ('Electrical Rough', 'electrical',  3,  true, true),
  ('Drywall',          'drywall',     4,  true, true),
  ('Cabinets',         'cabinets',    5,  true, true),
  ('Flooring',         'flooring',    6,  true, true),
  ('Painting',         'paint',       7,  true, true),
  ('Appliances',       'appliances',  8,  true, true),
  ('Cleaning',         'cleaning',    9,  true, false),
  ('Final Punch',      'final_punch', 10, true, false);

-- ============================================================
-- Seed Data: Demo Buildings
-- ============================================================
insert into public.buildings (id, name, address) values
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Elmwood Park Apartments', '1750 Elmwood Ave, Chicago, IL 60614'),
  ('a1b2c3d4-0000-0000-0000-000000000002', 'Riverview Heights',       '422 River Rd, Chicago, IL 60657'),
  ('a1b2c3d4-0000-0000-0000-000000000003', 'Lakeshore Commons',       '9900 S Lake Shore Dr, Chicago, IL 60628');

-- ============================================================
-- Seed Data: Demo Contractors
-- ============================================================
insert into public.contractors (company_name, contact_name, trade_type, phone, email) values
  ('Apex Demo & Haul',        'Marcus Webb',   'demo',        '312-555-0101', 'marcus@apexdemo.com'),
  ('Premier Plumbing Co.',    'Sandra Ruiz',   'plumbing',    '312-555-0202', 'sandra@premierplumbing.com'),
  ('Bright Wire Electric',    'Tom Nguyen',    'electrical',  '312-555-0303', 'tom@brightwire.com'),
  ('Solid Wall Systems',      'Carlos Diaz',   'drywall',     '312-555-0404', 'carlos@solidwall.com'),
  ('Keystone Cabinets',       'Lisa Park',     'cabinets',    '312-555-0505', 'lisa@keystonecabinets.com'),
  ('FloorCraft Installations','Derek Johnson', 'flooring',    '312-555-0606', 'derek@floorcraft.com'),
  ('ProPaint Chicago',        'Amara Owens',   'paint',       '312-555-0707', 'amara@propaintchi.com'),
  ('Midwest Appliance Install','Jim Torres',   'appliances',  '312-555-0808', 'jim@midwestappliance.com'),
  ('CleanSweep Services',     'Nina Patel',    'cleaning',    '312-555-0909', 'nina@cleansweep.com');

