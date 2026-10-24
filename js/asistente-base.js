/* SUPERVISION-FLANDES · BASE SEMBRADA DEL ASISTENTE (24/10/2026)
   Respaldo embebido: la usa el asistente la primera vez y en la entrada.
   La de verdad vive en el CORE (hoja ASISTENTE_TEMAS) y se edita en ADMIN;
   cuando cambia, llega con el arranque y reemplaza esta en el teléfono.
   Generado desde la semilla: no se edita a mano. */
window.ASISTENTE_BASE = [
{
"id": "S-INICIO",
"app": "SUPERVISION",
"vista": "",
"titulo": "Ir al inicio",
"frases": [
"ir al inicio",
"volver al inicio",
"pantalla principal",
"menu principal",
"regresar al menu"
],
"respuesta": "Te llevo a tu **inicio**: ahí están los bloques de la app y el resumen de tus cuentas.",
"accion": "ir:inicio",
"estado": "",
"activo": true,
"orden": 1
},
{
"id": "S-QUE-ME-TOCA",
"app": "SUPERVISION",
"vista": "inicio",
"titulo": "¿Qué tengo pendiente?",
"frases": [
"que tengo pendiente",
"que me toca hacer",
"que tengo que hacer hoy",
"que me falta",
"que hago primero",
"tengo algo pendiente",
"que es lo mas urgente",
"por donde empiezo hoy"
],
"respuesta": "{{queMeToca}}",
"accion": "",
"estado": "",
"activo": true,
"orden": 2
},
{
"id": "S-POR-REVISAR",
"app": "SUPERVISION",
"vista": "inicio,revisar",
"titulo": "¿Cuántas cuentas tengo por revisar?",
"frases": [
"cuantas cuentas tengo por revisar",
"cuentas por revisar",
"que cuentas me llegaron",
"cuentas nuevas",
"cuentas reportadas",
"me llegaron cuentas",
"revisar cuentas",
"tengo cuentas para revisar",
"bandeja de cuentas"
],
"respuesta": "{{porRevisar}}",
"accion": "ir:revisar",
"estado": "",
"activo": true,
"orden": 3
},
{
"id": "S-MAS-ANTIGUA",
"app": "SUPERVISION",
"vista": "inicio,revisar",
"titulo": "¿Cuál lleva más días esperando?",
"frases": [
"cual lleva mas dias",
"la cuenta mas antigua",
"cual reviso primero",
"cual esta esperando mas",
"cuenta mas vieja por revisar",
"cual se radico primero"
],
"respuesta": "{{masAntigua}}",
"accion": "ir:revisar",
"estado": "",
"activo": true,
"orden": 4
},
{
"id": "S-PLAN-PENDIENTE",
"app": "SUPERVISION",
"vista": "inicio,revisar",
"titulo": "¿Qué planes de pago me faltan?",
"frases": [
"planes de pago pendientes",
"que planes de pago me faltan",
"plan de pagos por aceptar",
"cuentas en plan de pagos",
"que falta en plan de pagos",
"aceptar planes de pago",
"informes por firmar"
],
"respuesta": "{{planPendiente}}",
"accion": "ir:plan",
"estado": "",
"activo": true,
"orden": 5
},
{
"id": "S-ALCANCE",
"app": "SUPERVISION",
"vista": "inicio",
"titulo": "¿Qué cuentas veo yo?",
"frases": [
"que cuentas veo",
"de quien son las cuentas que veo",
"por que no veo cuentas",
"no me salen cuentas",
"no veo ninguna cuenta",
"a quien superviso",
"que secretaria reviso",
"mi alcance"
],
"respuesta": "{{alcance}}",
"accion": "",
"estado": "",
"activo": true,
"orden": 6
},
{
"id": "S-REVISAR-COMO",
"app": "SUPERVISION",
"vista": "cuenta,revisar",
"titulo": "¿Cómo reviso una cuenta?",
"frases": [
"como reviso una cuenta",
"como reviso",
"pasos para revisar",
"revisar la cuenta de un contratista",
"como empiezo a revisar",
"abrir una cuenta para revisar",
"donde reviso los documentos"
],
"respuesta": "Abre la cuenta desde **REVISAR CUENTAS** y revísala por pestañas: **Contrato**, **Pago**, **Planilla** y **Actividades**. Marca con ✓ cada documento y cada obligación que ya miraste, deja tus notas y toca **Guardar revisión** (no cambia el estado). Cuando termines, **Tomar decisión**.",
"accion": "ir:revisar",
"estado": "",
"activo": true,
"orden": 7
},
{
"id": "S-VISOR",
"app": "SUPERVISION",
"vista": "cuenta",
"titulo": "¿Cómo veo los documentos y las evidencias?",
"frases": [
"como veo los documentos",
"abrir un documento",
"ver las evidencias",
"ver las fotos de la cuenta",
"no abre el pdf",
"ver los anexos",
"archivos de evidencia",
"carrusel de imagenes",
"hacer zoom"
],
"respuesta": "Cada documento se abre en el **visor** (se puede agrandar y minimizar) y cada imagen en el **carrusel** con zoom. En **Actividades**, cada obligación trae sus imágenes y, si el contratista los adjuntó, sus **archivos de evidencia** (hasta 5, numerados 1.1, 1.2…): tócalos y con las flechas pasas a los demás, ya precargados.",
"accion": "",
"estado": "",
"activo": true,
"orden": 8
},
{
"id": "S-PENDIENTE-MIRAR",
"app": "SUPERVISION",
"vista": "cuenta",
"titulo": "¿Qué me falta por mirar?",
"frases": [
"que me falta por mirar",
"que me falta revisar",
"que no he revisado",
"marcar como revisado",
"chulito de revisado",
"como marco lo revisado"
],
"respuesta": "Lo que ya miraste se marca con **✓** en cada documento y cada obligación, y queda guardado con **Guardar revisión**. Dentro de la cuenta, el robot de ayuda te dice con **¿Qué me falta por mirar?** cuáles obligaciones y documentos siguen sin ✓.",
"accion": "",
"estado": "",
"activo": true,
"orden": 9
},
{
"id": "S-NOTAS",
"app": "SUPERVISION",
"vista": "cuenta",
"titulo": "¿Nota interna o para el contratista?",
"frases": [
"nota interna",
"para el contratista",
"diferencia entre nota interna y para el contratista",
"dejar una observacion",
"escribir una observacion",
"el contratista ve mis notas",
"observaciones para el contratista",
"comentario en la cuenta"
],
"respuesta": "En cada obligación y cada documento hay dos cajas: **Nota interna** (solo la ve el equipo, nunca le llega al contratista) y **Para el contratista**. Al **devolver** o marcar **incompleta**, el motivo sale ya escrito con las de \"Para el contratista\", en orden; lo puedes editar antes de confirmar.",
"accion": "",
"estado": "",
"activo": true,
"orden": 10
},
{
"id": "S-GUARDAR-REV",
"app": "SUPERVISION",
"vista": "cuenta",
"titulo": "¿Guardar revisión cambia el estado?",
"frases": [
"guardar revision",
"se me borran las notas",
"perdi lo que escribi",
"guardar sin decidir",
"seguir revisando despues",
"guardar a medias"
],
"respuesta": "**Guardar revisión** deja tus ✓ y tus notas guardadas **sin cambiar el estado** de la cuenta, para seguir después o desde otro equipo. Si cerraste sin guardar, la app recupera en ese mismo teléfono lo que dejaste: toca **Guardar revisión** para no perderlo.",
"accion": "",
"estado": "",
"activo": true,
"orden": 11
},
{
"id": "S-DECIDIR",
"app": "SUPERVISION",
"vista": "cuenta",
"titulo": "¿Cómo apruebo, devuelvo o marco incompleta?",
"frases": [
"como apruebo",
"aprobar la cuenta",
"devolver la cuenta",
"marcar incompleta",
"tomar decision",
"como decido",
"rechazar la cuenta",
"la cuenta esta mal",
"la cuenta esta bien",
"dar por revisada"
],
"respuesta": "Toca **Tomar decisión** dentro de la cuenta:\n· **Aprobar**: sigue a Contratación y después al plan de pagos.\n· **Devolver**: vuelve al contratista para corregir.\n· **Incompleta**: le faltan soportes; solo adjunta lo que falta.\nAl devolver o marcar incompleta el motivo sale ya escrito con tus observaciones. {{puedoDecidir}}",
"accion": "ir:revisar",
"estado": "",
"activo": true,
"orden": 12
},
{
"id": "S-DEV-VS-INC",
"app": "SUPERVISION",
"vista": "cuenta",
"titulo": "¿Devuelta o incompleta?",
"frases": [
"diferencia entre devuelta e incompleta",
"devolver o incompleta",
"cuando marco incompleta",
"cuando devuelvo",
"le faltan soportes",
"le falta un documento"
],
"respuesta": "**Incompleta** es cuando lo que hay está bien pero **le falta algún soporte**: el contratista solo adjunta lo que falta. **Devuelta** es cuando hay que **corregir** algo de la cuenta (actividades, valores, formatos). En los dos casos le llega el motivo y vuelve a reportarla eligiendo CORRECCIÓN.",
"accion": "",
"estado": "",
"activo": true,
"orden": 13
},
{
"id": "S-A-NOMBRE",
"app": "SUPERVISION",
"vista": "cuenta",
"titulo": "¿A nombre de quién sale la decisión?",
"frases": [
"a nombre de quien sale",
"quien firma la decision",
"sale a mi nombre",
"el contratista ve quien reviso",
"quien aparece como revisor"
],
"respuesta": "Aprobar, devolver o marcar incompleta sale siempre **a nombre del supervisor del contrato**. Quién revisó de verdad queda en la historia de la cuenta.",
"accion": "",
"estado": "",
"activo": true,
"orden": 14
},
{
"id": "S-VISTO-BUENO",
"app": "SUPERVISION",
"vista": "cuenta",
"titulo": "¿Cómo doy el visto bueno?",
"frases": [
"visto bueno",
"como doy el visto bueno",
"con inconsistencia",
"soy revisor",
"que hace el revisor",
"marcar inconsistencia",
"concepto del revisor"
],
"respuesta": "El **revisor** revisa, deja notas y, al terminar, toca **Visto bueno o inconsistencia**: **Visto bueno** si las actividades y los soportes están bien, **Con inconsistencia** si hay algo que el supervisor debe mirar (dilo en la nota). Queda en la tarjeta con tu nombre, fecha y hora. {{puedoDecidir}}",
"accion": "",
"estado": "",
"activo": true,
"orden": 15
},
{
"id": "S-QUIEN-REVISA",
"app": "SUPERVISION",
"vista": "revisar,cuenta",
"titulo": "¿Quién está revisando qué?",
"frases": [
"quien esta revisando",
"otra persona esta revisando",
"quien tiene la cuenta abierta",
"revisiones a medias",
"quien dio visto bueno",
"que dijo el revisor"
],
"respuesta": "{{quienRevisa}}",
"accion": "ir:revisar",
"estado": "",
"activo": true,
"orden": 16
},
{
"id": "S-PLAN-COMO",
"app": "SUPERVISION",
"vista": "cuenta,revisar",
"titulo": "¿Cómo acepto el plan de pagos?",
"frases": [
"como acepto el plan de pagos",
"aceptar plan de pagos",
"plan de pagos",
"pasos del plan de pagos",
"que hago con el plan de pagos",
"el contratista reporto el plan",
"cerrar la cuenta"
],
"respuesta": "Cuando el contratista reporta el plan en el SECOP II, la cuenta llega a **PLAN DE PAGOS**:\n1. Revisa el plan en el SECOP II (botón **Ir a SECOP II**).\n2. **Firmar informe de supervisión**.\n3. Si es la **última cuenta** del contrato, **Firmar acta de cumplimiento**.\n4. **Aceptar plan de pagos**: la cuenta pasa a Contabilidad.\nSi el plan está mal, **Pedir corrección del plan**.",
"accion": "ir:plan",
"estado": "",
"activo": true,
"orden": 17
},
{
"id": "S-INFORME-SUP",
"app": "SUPERVISION",
"vista": "cuenta",
"titulo": "¿Cómo firmo el informe de supervisión?",
"frases": [
"firmar informe de supervision",
"informe de supervision",
"como firmo el informe",
"firmar el informe",
"volver a firmar el informe",
"el informe salio mal",
"ver el informe"
],
"respuesta": "En la cuenta en **plan de pagos** toca **Firmar informe de supervisión**: se arma con tu firma, se guarda en la carpeta de la cuenta y queda listo para el SECOP II. Si algo cambió, **Volver a firmar el informe** lo reemplaza. Para que salga tu firma, súbela en **MI FIRMA Y MI FOTO**.",
"accion": "ir:plan",
"estado": "",
"activo": true,
"orden": 18
},
{
"id": "S-ACTA",
"app": "SUPERVISION",
"vista": "cuenta,revisar",
"titulo": "¿Cuándo va el acta de cumplimiento?",
"frases": [
"acta de cumplimiento",
"acta final",
"ultima cuenta",
"firmar el acta",
"acta de liquidacion",
"cuando se firma el acta",
"volver a firmar el acta"
],
"respuesta": "El **acta de cumplimiento** va solo en la **última cuenta** del contrato y se firma antes de aceptar el plan de pagos. {{actasPendientes}}",
"accion": "ir:plan",
"estado": "",
"activo": true,
"orden": 19
},
{
"id": "S-CORREGIR-PLAN",
"app": "SUPERVISION",
"vista": "cuenta",
"titulo": "¿Cómo le pido corregir el plan de pagos?",
"frases": [
"corregir el plan de pagos",
"pedir correccion del plan",
"el plan de pagos esta mal",
"el plan de pagos tiene un error",
"error en el plan de pagos",
"el valor del plan no coincide",
"devolver el plan de pagos"
],
"respuesta": "En la cuenta en plan de pagos toca **Pedir corrección del plan** y especifica qué debe corregir en el SECOP II. Le llega por notificación y WhatsApp a nombre del supervisor; la cuenta **sigue en plan de pagos**. Cuando lo corrija, te avisa con REPORTAR CORRECCIÓN DEL PLAN.",
"accion": "ir:plan",
"estado": "",
"activo": true,
"orden": 20
},
{
"id": "S-SECOP",
"app": "SUPERVISION",
"vista": "",
"titulo": "Ir al SECOP II",
"frases": [
"secop",
"ir al secop",
"abrir secop ii",
"plataforma de contratacion",
"ver el plan en el secop",
"entrar al secop"
],
"respuesta": "Te abro el **SECOP II** en otra pestaña: ahí revisas el plan de pagos que subió el contratista.",
"accion": "ir:secop",
"estado": "",
"activo": true,
"orden": 21
},
{
"id": "S-REHACER",
"app": "SUPERVISION",
"vista": "cuenta",
"titulo": "¿Cómo rehago los documentos de una cuenta?",
"frases": [
"rehacer documentos",
"los documentos salieron mal",
"volver a generar los documentos",
"regenerar documentos",
"actualizar los documentos de la cuenta"
],
"respuesta": "Dentro de la cuenta, arriba, toca **Rehacer documentos**: se vuelven a generar los documentos combinados de su carpeta (y el informe o el acta, si ya estaban firmados) con los datos que hay **hoy**. Los anteriores se reemplazan y la cuenta no cambia de estado. Si el botón no sale, tu usuario no tiene ese permiso.",
"accion": "",
"estado": "",
"activo": true,
"orden": 22
},
{
"id": "S-EN-CONTRATACION",
"app": "SUPERVISION",
"vista": "revisar",
"titulo": "¿Qué cuentas están en Contratación?",
"frases": [
"en contratacion",
"cuentas aprobadas por mi",
"ya las aprobe",
"que paso con las que aprobe",
"revisadas por supervisor",
"cuentas en contratacion"
],
"respuesta": "{{enContratacion}}",
"accion": "ir:contratacion",
"estado": "",
"activo": true,
"orden": 23
},
{
"id": "S-DEVUELTAS",
"app": "SUPERVISION",
"vista": "revisar",
"titulo": "¿Cuáles devolví o están incompletas?",
"frases": [
"cuentas devueltas",
"cuales devolvi",
"cuentas incompletas",
"esperando correccion",
"que devolvi"
],
"respuesta": "{{devueltas}}",
"accion": "ir:devueltas",
"estado": "",
"activo": true,
"orden": 24
},
{
"id": "S-RECORDAR",
"app": "SUPERVISION",
"vista": "revisar,inicio",
"titulo": "¿A quién le debo recordar?",
"frases": [
"a quien le recuerdo",
"recordar reporte",
"recordar correccion",
"recordatorio al contratista",
"avisarle al contratista",
"no ha corregido",
"corrigio y no reporto"
],
"respuesta": "{{recordar}}\nEn **Ingresadas** cada tarjeta trae **Recordar reporte** y en **Devueltas** e **Incompletas**, **Recordar corrección**: le llega a tu nombre, con los días que lleva vencida o los que le quedan (uno por cuenta al día).",
"accion": "ir:devueltas",
"estado": "",
"activo": true,
"orden": 25
},
{
"id": "S-INGRESADAS",
"app": "SUPERVISION",
"vista": "revisar",
"titulo": "¿Qué son las cuentas ingresadas?",
"frases": [
"ingresadas",
"que es ingresada",
"cuenta ingresada",
"la corrigio pero no la reporto",
"pastilla ingresadas"
],
"respuesta": "**Ingresadas** son las cuentas que fueron devueltas o incompletas, el contratista **ya corrigió** pero **todavía no ha reportado**. Mientras no la reporte no te llega para revisar: usa **Recordar reporte** en su tarjeta.",
"accion": "ir:ingresadas",
"estado": "",
"activo": true,
"orden": 26
},
{
"id": "S-FILTRAR",
"app": "SUPERVISION",
"vista": "revisar",
"titulo": "¿Cómo filtro la lista?",
"frases": [
"como filtro",
"filtrar cuentas",
"buscar un contratista",
"buscar una cuenta",
"pastillas de estado",
"ver solo las de una secretaria"
],
"respuesta": "Arriba de la lista filtras por **estado** (por revisar, plan de pagos, en Contratación, devueltas, incompletas, aprobadas, ingresadas), por **cómo va la revisión** (sin abrir, en revisión, visto bueno, con inconsistencia), por secretaría y con el buscador (nombre, documento o contrato). El filtro se queda puesto.",
"accion": "ir:revisar",
"estado": "",
"activo": true,
"orden": 27
},
{
"id": "S-DESCARGAR-LISTA",
"app": "SUPERVISION",
"vista": "revisar",
"titulo": "¿Cómo descargo la lista de cuentas?",
"frases": [
"descargar la lista",
"exportar cuentas",
"lista en excel",
"lista en pdf",
"bajar las cuentas"
],
"respuesta": "En la lista toca el botón de **descarga**: **Excel** trae una fila por cuenta y **PDF** un informe por bloques. Sale lo que estás viendo, con los filtros puestos.",
"accion": "ir:revisar",
"estado": "",
"activo": true,
"orden": 28
},
{
"id": "S-COBRO",
"app": "SUPERVISION",
"vista": "revisar",
"titulo": "¿Cuánto cobran las cuentas por revisar?",
"frases": [
"cuanto cobran",
"valor de las cuentas por revisar",
"cuanta plata",
"total a pagar",
"cuanto suman las cuentas"
],
"respuesta": "{{cobroPorRevisar}}",
"accion": "ir:revisar",
"estado": "",
"activo": true,
"orden": 29
},
{
"id": "S-ATRASADAS",
"app": "SUPERVISION",
"vista": "inicio,atrasos",
"titulo": "¿Quién tiene la cuenta atrasada?",
"frases": [
"cuentas atrasadas",
"quien esta atrasado",
"quien no ha presentado",
"contratistas atrasados",
"cuentas vencidas",
"quien no ha radicado"
],
"respuesta": "{{atrasados}}",
"accion": "ir:atrasos",
"estado": "",
"activo": true,
"orden": 30
},
{
"id": "S-PLAZO",
"app": "SUPERVISION",
"vista": "atrasos",
"titulo": "¿Cómo se cuenta el plazo?",
"frases": [
"como se cuenta el plazo",
"cuantos dias tienen para presentar",
"plazo para presentar la cuenta",
"dias habiles",
"cuando queda atrasada"
],
"respuesta": "El periodo de cada cuenta va mes a mes desde la fecha de inicio del contrato. Desde el día siguiente al fin del periodo se cuentan **{{diasPlazo}} días hábiles** (sin sábados, domingos ni festivos). Si al terminar ese día la cuenta no se ha **reportado** al supervisor, queda atrasada.",
"accion": "ir:atrasos",
"estado": "",
"activo": true,
"orden": 31
},
{
"id": "S-RECORDAR-ATRASO",
"app": "SUPERVISION",
"vista": "atrasos",
"titulo": "¿Cómo le recuerdo a un atrasado?",
"frases": [
"recordarle al atrasado",
"avisar a los atrasados",
"boton recordar",
"compartir la lista",
"mandar la lista de atrasados"
],
"respuesta": "En **CUENTAS ATRASADAS**, **Recordar** le avisa al contratista, a nombre del supervisor del contrato, sus cuentas vencidas con los días hábiles, por push y WhatsApp (uno por contrato al día). **Compartir** abre el compartir de tu teléfono con la lista escrita: tú escoges el chat, el grupo o el correo.",
"accion": "ir:atrasos",
"estado": "",
"activo": true,
"orden": 32
},
{
"id": "S-AGENDA",
"app": "SUPERVISION",
"vista": "inicio,agenda",
"titulo": "¿Qué días me llega más trabajo?",
"frases": [
"agenda de revision",
"que dias me llega trabajo",
"cuando me llegan las cuentas",
"calendario de cuentas",
"quienes llegan esta semana",
"que tengo hoy"
],
"respuesta": "{{agenda}}",
"accion": "ir:agenda",
"estado": "",
"activo": true,
"orden": 33
},
{
"id": "S-AGENDA-ROJO",
"app": "SUPERVISION",
"vista": "agenda",
"titulo": "¿Por qué una cuenta sale en rojo?",
"frases": [
"por que sale en rojo",
"rojo en la agenda",
"rojo fuerte",
"que significa el verde",
"colores de la agenda"
],
"respuesta": "**Rojo**: ya pasó su día probable y la cuenta no ha llegado, pero sigue en plazo. **Rojo fuerte**: además se le venció el plazo (también sale en CUENTAS ATRASADAS). En los días que ya pasaron, lo **verde** es lo que de verdad llegó ese día.",
"accion": "ir:agenda",
"estado": "",
"activo": true,
"orden": 34
},
{
"id": "S-AGENDA-IMPRIMIR",
"app": "SUPERVISION",
"vista": "agenda",
"titulo": "¿Cómo imprimo la agenda?",
"frases": [
"imprimir la agenda",
"agenda en excel",
"agenda en pdf",
"descargar la agenda"
],
"respuesta": "Elige la vista (Mes, Semana, Día, Cortes o Lista), el periodo con las flechas y los filtros; luego **Imprimir** (PDF) o **Excel**. Sale exactamente lo que estás viendo.",
"accion": "ir:agenda",
"estado": "",
"activo": true,
"orden": 35
},
{
"id": "S-CONTRATISTAS",
"app": "SUPERVISION",
"vista": "inicio,contratistas",
"titulo": "Ver mis contratistas",
"frases": [
"mis contratistas",
"ver contratistas",
"lista de contratistas",
"contratos de mi supervision",
"ficha del contratista",
"datos del contratista",
"whatsapp del contratista",
"drive del contratista"
],
"respuesta": "En **CONTRATISTAS** están los contratos de tu supervisión. En cada tarjeta: **Detalles** (la ficha), **Informe** (sus cuentas en PDF o Excel), **Requerimiento**, WhatsApp y Drive. Un contratista con dos contratos sale dos veces.",
"accion": "ir:contratistas",
"estado": "",
"activo": true,
"orden": 36
},
{
"id": "S-INFORME-CONTRATO",
"app": "SUPERVISION",
"vista": "contratistas,contratista,informe",
"titulo": "¿Cómo descargo el informe de un contratista?",
"frases": [
"informe del contratista",
"descargar informe",
"cuentas de un contratista",
"informe en pdf",
"informe en excel",
"cuanto ha cobrado",
"saldo del contrato"
],
"respuesta": "En **CONTRATISTAS**, toca **Informe** en la tarjeta del contratista: ves valor, cobrado, pagado y saldo, y lo bajas en **PDF** (por bloques, con actividades si quieres) o **Excel** (una fila por cuenta). Cada informe es de un solo contrato.",
"accion": "ir:contratistas",
"estado": "",
"activo": true,
"orden": 37
},
{
"id": "S-FALTA-CONTRATO",
"app": "SUPERVISION",
"vista": "contratista",
"titulo": "¿Qué le falta a un contrato?",
"frases": [
"que le falta al contrato",
"le faltan fechas",
"no tiene rp",
"no tiene firma",
"datos incompletos del contratista"
],
"respuesta": "Abre su **ficha** (Detalles en CONTRATISTAS) y pregúntale al robot **¿Qué le falta a este contrato?**: te dice si falta el proceso del SECOP II, fechas, RP, firma, cuenta bancaria, EPS o ARL. Lo diligencia el contratista desde su app (algunos datos los pone Contratación).",
"accion": "ir:contratistas",
"estado": "",
"activo": true,
"orden": 38
},
{
"id": "S-REQUERIMIENTO",
"app": "SUPERVISION",
"vista": "requerimientos,contratistas,contratista",
"titulo": "¿Cómo le pido algo a un contratista?",
"frases": [
"requerimiento",
"pedirle algo al contratista",
"mandar un requerimiento",
"solicitarle un documento",
"escribirle a varios contratistas"
],
"respuesta": "En **REQUERIMIENTOS** → Contratistas eliges a quién (solo los de tu supervisión): **Redactar**, o marca varios y redacta una vez (máximo 20). Le llega como notificación y por WhatsApp, firmado como Supervisión. En **Historial** lo marcas **atendido** cuando lo resuelva.",
"accion": "ir:requerimientos",
"estado": "",
"activo": true,
"orden": 39
},
{
"id": "S-COMUNICADO",
"app": "SUPERVISION",
"vista": "comunicados",
"titulo": "¿Cómo publico un comunicado?",
"frases": [
"publicar un comunicado",
"comunicado a los contratistas",
"aviso a todos",
"mandar un aviso",
"retirar un comunicado"
],
"respuesta": "En **COMUNICADOS** toca **Nuevo comunicado**: escribe, adjunta documentos y publica. Llega como notificación a los teléfonos de los contratistas. **Retirar** lo quita de su app sin borrarlo.",
"accion": "ir:comunicados",
"estado": "",
"activo": true,
"orden": 40
},
{
"id": "S-COMUNICACIONES",
"app": "SUPERVISION",
"vista": "comunicaciones",
"titulo": "¿Cómo le pido apoyo a Comunicaciones?",
"frases": [
"solicitud a comunicaciones",
"pedir fotos",
"pedir un video",
"pieza grafica",
"publicacion en redes",
"prensa"
],
"respuesta": "En **SOLICITUD A COMUNICACIONES** pides fotos, video, piezas gráficas o publicaciones para tu secretaría. Desde Supervisión **no hay antelación mínima**. Abajo ves en qué va cada solicitud.",
"accion": "ir:comunicaciones",
"estado": "",
"activo": true,
"orden": 41
},
{
"id": "S-FIRMADOS",
"app": "SUPERVISION",
"vista": "firmados",
"titulo": "¿Dónde veo los informes firmados?",
"frases": [
"informes firmados",
"lo que he firmado",
"ver informes de supervision",
"id de firma",
"codigo qr del informe"
],
"respuesta": "En **INFORMES FIRMADOS** está cada informe de supervisión firmado con su **ID de firma** (el del QR). **Ver informe** lo abre aquí; en la última cuenta también está el **acta final**. Lo descargas en PDF o Excel.",
"accion": "ir:firmados",
"estado": "",
"activo": true,
"orden": 42
},
{
"id": "S-REPORTE",
"app": "SUPERVISION",
"vista": "reporte",
"titulo": "¿Cómo saco el reporte de mi supervisión?",
"frases": [
"reporte de supervision",
"reporte de cuentas",
"todas las cuentas",
"cuentas pagadas",
"reporte en excel",
"reporte en pdf"
],
"respuesta": "En **REPORTE** ves todas las cuentas de tu supervisión por etapa (en supervisión, en Contratación, devueltas, en pago y pagadas). Elige el rango de radicación, filtra y descarga en **PDF** o **Excel**.",
"accion": "ir:reporte",
"estado": "",
"activo": true,
"orden": 43
},
{
"id": "S-MISREGISTROS",
"app": "SUPERVISION",
"vista": "misregistros,inicio",
"titulo": "¿Dónde descargo lo que hice?",
"frases": [
"mis registros",
"lo que he hecho",
"descargar lo que hice",
"mis actividades",
"cuentas que aprobe",
"informe gerencial",
"evidencia de mi trabajo"
],
"respuesta": "En **MIS REGISTROS** está todo lo que has hecho (cuentas aprobadas, devueltas e incompletas, planes aceptados, informes y actas firmados, vistos buenos) con fecha y hora. Elige el periodo y descarga en **PDF**, **Excel** o el **Informe gerencial**.",
"accion": "ir:misregistros",
"estado": "",
"activo": true,
"orden": 44
},
{
"id": "S-FIRMA",
"app": "SUPERVISION",
"vista": "perfil",
"titulo": "¿Cómo cambio mi firma?",
"frases": [
"cambiar mi firma",
"subir mi firma",
"mi firma no sale",
"firma del informe",
"foto de la firma"
],
"respuesta": "En **MI FIRMA Y MI FOTO** sube una foto de tu firma en **papel blanco**, con tinta negra o azul oscura y buena luz: la app quita el fondo y la recorta. Es la que sale en el informe de supervisión y en el acta.",
"accion": "ir:perfil",
"estado": "",
"activo": true,
"orden": 45
},
{
"id": "S-DIRECTORIO",
"app": "SUPERVISION",
"vista": "directorio",
"titulo": "Directorio institucional",
"frases": [
"directorio",
"telefono de una dependencia",
"correo de una oficina",
"donde queda",
"como llegar a la alcaldia"
],
"respuesta": "En el **DIRECTORIO** están las dependencias con dirección, correo y líneas: **Cómo llegar**, **Correo**, **WhatsApp** o **Llamar**.",
"accion": "ir:directorio",
"estado": "",
"activo": true,
"orden": 46
},
{
"id": "S-DRIVE",
"app": "SUPERVISION",
"vista": "drive",
"titulo": "Drive de Hacienda",
"frases": [
"drive de hacienda",
"carpeta compartida",
"carpeta de hacienda",
"archivos de hacienda"
],
"respuesta": "El **DRIVE DE HACIENDA** es la carpeta compartida de la Secretaría: entra a las carpetas y toca un PDF o una imagen para verlo aquí. Quién la ve lo define el administrador.",
"accion": "ir:drive",
"estado": "",
"activo": true,
"orden": 47
},
{
"id": "S-FOTO",
"app": "SUPERVISION",
"vista": "",
"titulo": "Cambiar mi foto",
"frases": [
"cambiar mi foto",
"foto de perfil",
"poner mi foto",
"quitar mi foto"
],
"respuesta": "Tu foto es la misma en todas las apps de la Alcaldía. Te abro el cambio de foto.",
"accion": "foto",
"estado": "",
"activo": true,
"orden": 48
},
{
"id": "S-CLAVE",
"app": "SUPERVISION",
"vista": "",
"titulo": "Cambiar mi contraseña",
"frases": [
"cambiar contraseña",
"cambiar la clave",
"actualizar contraseña",
"nueva contraseña"
],
"respuesta": "Desde el menú de tu perfil → **Actualizar contraseña**. Te lo abro.",
"accion": "clave",
"estado": "",
"activo": true,
"orden": 49
},
{
"id": "S-INSTALAR",
"app": "SUPERVISION",
"vista": "",
"titulo": "Instalar la app",
"frases": [
"instalar la app",
"poner la app en el celular",
"acceso directo",
"descargar la app"
],
"respuesta": "Instálala en tu teléfono o computador: queda como una app más y abre más rápido.",
"accion": "instalar",
"estado": "",
"activo": true,
"orden": 50
},
{
"id": "S-AVISOS",
"app": "SUPERVISION",
"vista": "",
"titulo": "¿Por qué no me llegan los avisos?",
"frases": [
"no me llegan los avisos",
"notificaciones",
"activar notificaciones",
"avisos al telefono",
"no me suena"
],
"respuesta": "{{avisosTelefono}}",
"accion": "",
"estado": "",
"activo": true,
"orden": 51
},
{
"id": "S-GUIA",
"app": "SUPERVISION",
"vista": "inicio",
"titulo": "Descargar la guía rápida",
"frases": [
"guia rapida",
"manual",
"instructivo",
"como funciona la app",
"tutorial",
"ayuda en pdf"
],
"respuesta": "La **guía rápida** de Supervisión explica cada vista paso a paso. Te la descargo.",
"accion": "guia",
"estado": "",
"activo": true,
"orden": 52
},
{
"id": "S-SOPORTE",
"app": "SUPERVISION",
"vista": "",
"titulo": "Hablar con soporte",
"frases": [
"soporte",
"hablar con soporte",
"reportar un error",
"la app falla",
"la app no funciona",
"no funciona",
"no me deja",
"algo no funciona",
"se queda cargando",
"error"
],
"respuesta": "Cuéntale a **soporte** qué pasó (una captura ayuda). Le llega al equipo de desarrollo y te responden por la app.",
"accion": "soporte",
"estado": "",
"activo": true,
"orden": 53
},
{
"id": "SE-OLVIDE",
"app": "SUPERVISION",
"vista": "entrada",
"titulo": "Olvidé mi contraseña",
"frases": [
"olvide mi contraseña",
"no me acuerdo de la clave",
"recuperar contraseña",
"perdi la contraseña",
"cambiar la clave"
],
"respuesta": "Escribe tu **documento** y toca **Olvidé mi contraseña**: te llega una nueva a tu WhatsApp registrado.",
"accion": "olvide",
"estado": "",
"activo": true,
"orden": 54
},
{
"id": "SE-ENTRAR",
"app": "SUPERVISION",
"vista": "entrada",
"titulo": "¿Cómo entro?",
"frases": [
"como entro",
"como ingreso",
"iniciar sesion",
"no puedo entrar",
"con que entro",
"usuario y contraseña"
],
"respuesta": "Entra con tu **número de documento** (sin puntos) y tu **contraseña**. Si no la tienes o no te funciona, usa **Olvidé mi contraseña**.",
"accion": "documento",
"estado": "",
"activo": true,
"orden": 55
},
{
"id": "SE-ACCESO",
"app": "SUPERVISION",
"vista": "entrada",
"titulo": "No tengo acceso a Supervisión",
"frases": [
"no tengo acceso",
"no tengo usuario",
"me dice que no tengo permiso",
"soy supervisor nuevo",
"soy revisor nuevo",
"crear usuario"
],
"respuesta": "Los usuarios de Supervisión (supervisores y revisores) los crea el **administrador** del ecosistema. Pídeselo indicando tu nombre, documento y la secretaría que supervisas o revisas.",
"accion": "",
"estado": "",
"activo": true,
"orden": 56
},
{
"id": "SE-INSTALAR",
"app": "SUPERVISION",
"vista": "entrada",
"titulo": "Instalar la app",
"frases": [
"instalar la app",
"poner la app en el celular",
"descargar la app",
"acceso directo"
],
"respuesta": "Puedes instalarla en tu teléfono o computador para abrirla como una app más.",
"accion": "instalar",
"estado": "",
"activo": true,
"orden": 57
},
{
"id": "SE-QUE-ES",
"app": "SUPERVISION",
"vista": "entrada",
"titulo": "¿Para qué sirve esta app?",
"frases": [
"para que sirve",
"que es esta app",
"que hago aqui",
"que es supervision"
],
"respuesta": "**Supervisión** es la app de los supervisores y revisores de la Alcaldía: revisar las cuentas de los contratistas, firmar el informe de supervisión y el acta, y aceptar el plan de pagos.",
"accion": "",
"estado": "",
"activo": true,
"orden": 58
}
];
