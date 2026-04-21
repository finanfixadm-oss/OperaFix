insert into management_case_documents (id, management_case_id, document_type, title)
select gen_random_uuid(), c.id, t.document_type, t.document_type
from management_cases c
cross join (
  values
    ('Orden de compra'),
    ('Factura'),
    ('Detalle de trabajadores'),
    ('Archivo de gestión'),
    ('Carta explicativa'),
    ('Detalle de pago'),
    ('Comprobante de pago'),
    ('Poder'),
    ('Archivo AFP'),
    ('Respuesta CEN')
) as t(document_type)
where false;
-- plantilla de referencia: este script no inserta nada por defecto,
-- solo deja documentados los tipos documentales por gestión.
