// site/js/utils/i18n.js

/**
 * Sistema de internacionalización (i18n)
 * Soporta ES (español) y EN (inglés)
 */

const SUPPORTED_LOCALES = ['es', 'en'];
const DEFAULT_LOCALE = 'es';
const STORAGE_KEY = 'app_locale';

/**
 * Traducciones para toda la aplicación
 */
const translations = {
  es: {
    // Common
    common: {
      loading: 'Cargando...',
      save: 'Guardar',
      cancel: 'Cancelar',
      delete: 'Eliminar',
      edit: 'Editar',
      close: 'Cerrar',
      continue: 'Continuar',
      back: 'Volver',
      next: 'Siguiente',
      previous: 'Anterior',
      yes: 'Sí',
      no: 'No',
      ok: 'Aceptar',
      error: 'Error',
      success: 'Éxito',
      warning: 'Advertencia',
      info: 'Información',
      search: 'Buscar',
      filter: 'Filtrar',
      sort: 'Ordenar',
      select: 'Seleccionar',
      upload: 'Subir',
      download: 'Descargar',
      required: 'Requerido',
      optional: 'Opcional',
      confirm: 'Confirmar',
      send: 'Enviar',
      refresh: 'Actualizar',
      view: 'Ver',
      more: 'Más',
      less: 'Menos',
      all: 'Todos',
      none: 'Ninguno',
      apply: 'Aplicar',
      reset: 'Restablecer',
      clear: 'Limpiar',
      add: 'Añadir',
      remove: 'Eliminar',
      copy: 'Copiar',
      paste: 'Pegar',
      cut: 'Cortar',
      undo: 'Deshacer',
      redo: 'Rehacer',
      active: 'Activo',
      inactive: 'Inactivo',
      enabled: 'Habilitado',
      disabled: 'Deshabilitado',
      or: 'o',
      and: 'y',
      validating: 'Validando...',
      applying: 'Aplicando...',
    },
    
    // Navbar
    navbar: {
      features: 'Características',
      howItWorks: 'Cómo funciona',
      pricing: 'Precios',
      faq: 'FAQ',
      login: 'Iniciar sesión',
      logout: 'Cerrar sesión',
      joinFree: 'Únete gratis',
      backToProfile: 'Volver al perfil',
      backToHome: 'Volver al inicio',
    },
    
    // Landing page
    landing: {
      heroTitle: 'Atención al cliente e-commerce rápida y humana',
      heroSubtitle: 'Reduce hasta un 60% el tiempo de respuesta y dedica más tiempo a lo que importa',
      startFree: 'Únete gratis',
      noCreditCard: 'Sin tarjeta de crédito',
      freeTrial: 'Prueba gratis',
      tryNow: 'Pruébalo ahora',
      learnMore: 'Saber más',
      getStarted: 'Comenzar',
      watchDemo: 'Ver demo',
      joinNow: 'Únete ahora',
      trustedBy: 'Empresas que confían en nosotros',
      featuredIn: 'Destacado en',
      videoDemo: 'Vídeo Demo próximamente',
      securityFirst: 'Seguridad y privacidad primero',
      securityDescription: 'Cumplimos con el Reglamento General de Protección de Datos (GDPR) y contamos con la verificación de seguridad de Google (CASA Tier 2), requerida para apps con acceso a datos restringidos.',
      featuredBenefits: 'Beneficios destacados',
      responses247: 'Respuestas 24/7',
      responses247Desc: 'Respondize no descansa: genera borradores y respuestas día y noche para que tú puedas centrarte en lo que de verdad importa. Cuando entras a tu bandeja ya tienes todo preparado para revisar y enviar.',
      doublePerformance: 'Duplica el rendimiento de tu equipo',
      doublePerformanceDesc: 'Nuestros primeros testers están viendo mejoras de hasta un 60 % en el número de conversaciones que resuelven al día con el mismo equipo. Respondize se ocupa de las respuestas repetitivas y tu equipo de los casos de más valor.',
      connectedResponses: 'Respuestas conectadas a pedidos',
      connectedResponsesDesc: 'Si trabajas con Shopify, puedes conectar tu tienda para que Respondize consulte pedidos, estados de envío... Así gestionas devoluciones, cambios e incidencias sin salir del propio correo.',
      quickOnboarding: 'Onboarding en menos de 10 minutos',
      quickOnboardingDesc: 'Conecta tu correo, sube tus políticas y responde a unas pocas preguntas sobre tu negocio. Sin instalaciones, sin código y sin proyectos de IT: en menos de 10 minutos tienes a Respondize lista para ayudar.',
      helpfulMetrics: 'Métricas que sí ayudan a decidir',
      helpfulMetricsDesc: 'Ve tiempos de respuesta, motivos de contacto y volumen por tipo de consulta para decidir dónde automatizar más y dónde reforzar tu equipo. (Disponible próximamente).',
      howItWorksTitle: 'Cómo funciona',
      step1Title: 'Conecta tu tienda',
      step1Desc: 'Sube información de tus productos, políticas y FAQs para que Respondize conozca tu negocio.',
      step2Title: 'Llegan consultas',
      step2Desc: 'Tus clientes envían preguntas desde Gmail (Outlook próximamente) directamente a tu bandeja.',
      step3Title: 'Respondize genera respuesta',
      step3Desc: 'Respondize analiza el contexto y redacta un borrador personalizado en un par de minutos.',
      step4Title: 'Tú apruebas y envías',
      step4Desc: 'Revisas, editas si quieres, y envías con un click. Tienes el control total en cada respuesta.',
      storeOnline: 'Tienda Online',
      storeDescription: 'Sube la información de tu tienda',
      customer: 'Cliente',
      customerSends: 'Envía consulta',
      aiBot: 'Respondize',
      aiProcesses: 'Procesa y redacta',
      you: 'Tú',
      youReview: 'Revisas y apruebas',
      generatedDraft: 'Borrador generado',
      inbox: 'Bandeja de entrada',
      faqTitle: 'Preguntas frecuentes',
      faq1Question: '¿Es mi información segura?',
      faq1Answer: 'Sí. Los usuarios inician sesión con correo y contraseña y estas se almacenan de forma hasheada (no guardamos la contraseña en texto plano). La conexión con Gmail y otros servicios se hace mediante OAuth oficial y los datos se cifran tanto en tránsito como en reposo. Respondize está diseñada para cumplir con el GDPR y ha superado la verificación de seguridad de Google CASA Tier 2 para apps con acceso a datos restringidos. Tus correos no se utilizan para entrenar modelos de IA globales.',
      faq2Question: '¿Tengo control humano?',
      faq2Answer: 'Siempre. Respondize genera borradores y respuestas automáticas, pero tú decides qué se envía. Puedes revisar, editar y aprobar cada mensaje, o limitar la automatización a ciertos tipos de consultas. La herramienta se adapta al nivel de control que quieras mantener.',
      faq3Question: '¿Cómo se cuentan las conversaciones?',
      faq3Answer: 'Contamos las conversaciones (tickets) cuando un problema se marca como solucionado en Respondize. Es decir, cada conversación resuelta consume una unidad de tu uso mensual. Mientras un caso sigue abierto o en seguimiento, no se vuelve a contar. Si necesitas más capacidad, podrás ampliarla con packs adicionales.',
      faq4Question: '¿Qué integraciones incluye?',
      faq4Answer: 'Actualmente Respondize se integra con Gmail y con Shopify, lo que permite responder a tus clientes con datos de pedido, devoluciones y estado de envío directamente desde el correo. Estamos trabajando en la integración con Outlook y, más adelante, en canales como Instagram o WhatsApp Business para centralizar toda la atención al cliente en un mismo sitio.',
      faq5Question: '¿Puedo cancelar?',
      faq5Answer: 'Sí. Puedes cancelar tu suscripción cuando quieras desde el panel de cuenta. No se te cobrará el siguiente ciclo de facturación y, tras un periodo de 2 meses de inactividad, eliminaremos tus datos para cumplir con la normativa europea de protección de datos, salvo que la ley exija conservarlos durante más tiempo.',
      faq6Question: '¿Se tarda mucho en configurar la app a mi medida?',
      faq6Answer: 'No. En la mayoría de casos tendrás Respondize funcionando en menos de 10 minutos: creas tu cuenta, conectas tu correo, subes tus políticas y añades la información básica de tu tienda (metodos de pago, tarifas...). A partir de ahí, Respondize ya puede empezar a generar respuestas adaptadas a tu negocio.',
      ctaTitle: 'Gana tiempo para lo que de verdad importa',
      ctaSubtitle: 'Deja el trabajo repetitivo en nuestras manos y dedica tu día a clientes, producto y crecimiento.',
      ctaButton: 'Empieza gratis',
      footerTagline: 'Transformando la atención al cliente con IA',
      footerProduct: 'Producto',
      footerFeatures: 'Características',
      footerPricing: 'Precios',
      footerFaq: 'FAQ',
      footerLegal: 'Legal',
      footerSocial: 'Social',
      footerPrivacy: 'Privacidad',
      footerTerms: 'Términos',
      footerDisclaimer: 'Respondize procesa tus correos en tiempo real para generar respuestas personalizadas y no utiliza tus datos para entrenar modelos de IA globales. Consulta nuestra Política de Privacidad para más detalles.',
      footerCopyright: '© 2024 Respondize. Todos los derechos reservados.',
      modalTitle: 'Antes de empezar: tendrás que autorizar a Respondize en Google',
      modalDescription: 'En el siguiente paso se puede ver la pantalla de Google para conceder permisos de forma segura. Es necesario para conectar tu cuenta y que Respondize funcione al 100%.',
      modalCaption: 'En la imagen puedes ver por qué solicitamos cada permiso.',
      modalContinue: 'Continuar',
    },
    
    // Auth pages
    auth: {
      login: 'Iniciar sesión',
      loginTitle: 'Inicia sesión en tu cuenta',
      loginSubtitle: 'Continúa gestionando tus correos de forma inteligente',
      register: 'Crear cuenta',
      registerTitle: 'Crea tu cuenta',
      email: 'Correo electrónico',
      password: 'Contraseña',
      confirmPassword: 'Confirmar contraseña',
      forgotPassword: '¿Olvidaste tu contraseña?',
      resetPassword: 'Restablecer contraseña',
      authFooterText: 'Al iniciar sesión, aceptas nuestros',
      termsOfService: 'Términos de servicio',
      and: 'y',
      privacyPolicy: 'Política de privacidad',
      backToHome: 'Volver a la página principal',
      noAccount: '¿No tienes cuenta?',
      haveAccount: '¿Ya tienes cuenta?',
      createAccount: 'Crear cuenta',
      loginHere: 'Inicia sesión aquí',
      registerHere: 'Regístrate aquí',
      sendResetLink: 'Enviar enlace',
      backToLogin: 'Volver a inicio de sesión',
      verifyEmail: 'Verificar correo',
      verifyEmailMessage: 'Te hemos enviado un correo de verificación',
      resendEmail: 'Reenviar correo',
      emailPlaceholder: 'tu@email.com',
      passwordPlaceholder: 'Ingresa tu contraseña',
      confirmPasswordPlaceholder: 'Confirma tu contraseña',
      loginWithShopify: 'Iniciar sesión con Shopify',
      registerWithShopify: 'Registrarse con Shopify',
      orContinueWith: 'O continúa con',
      website: 'Página web',
      websitePlaceholder: 'www.tupagina.com',
      createSecurePassword: 'Crea una contraseña segura',
      confirmYourPassword: 'Confirma tu contraseña',
      showPassword: 'Mostrar contraseña',
      passwordStrengthWeak: 'Contraseña débil',
      passwordStrengthFair: 'Contraseña aceptable',
      passwordStrengthGood: 'Contraseña buena',
      passwordStrengthStrong: '¡Contraseña fuerte!',
      enterYourPassword: 'Ingresa tu contraseña',
      agreeToTerms: 'Acepto los',
      termsOfService: 'Términos de Servicio',
      and: 'y la',
      privacyPolicy: 'Política de Privacidad',
      startManagingEmails: 'Comienza a gestionar tus correos de forma inteligente',
    },
    
    // Profile page
    profile: {
      title: 'Perfil de Usuario',
      storeInfo: 'Información de la Tienda',
      personalInfo: 'Información Personal',
      preferences: 'Preferencias',
      storeName: 'Nombre de la Tienda *',
      storeUrl: 'URL de la Tienda',
      storeDescription: 'Descripción de la Tienda',
      hasPhysicalLocation: 'Mi tienda tiene una ubicación física',
      physicalLocation: 'Ubicación Física',
      address: 'Dirección',
      city: 'Ciudad',
      state: 'Provincia',
      zip: 'Código Postal',
      country: 'País',
      phone: 'Teléfono',
      firstName: 'Nombre *',
      lastName: 'Apellidos *',
      language: 'Idioma',
      timezone: 'Zona Horaria',
      saveChanges: 'Guardar Cambios',
      cancelChanges: 'Cancelar',
      changingsSaved: 'Cambios guardados correctamente',
      errorSaving: 'Error al guardar los cambios',
      managePlan: 'Gestionar plan',
      currentPlan: 'Plan actual',
      deleteAccount: 'Eliminar cuenta',
      deleteAccountConfirm: '¿Estás seguro de que quieres eliminar tu cuenta?',
      accountDeleted: 'Cuenta eliminada correctamente',
      spanish: 'Español',
      english: 'Inglés',
      storeNameHint: 'Así es como aparecerá tu tienda para los clientes',
      storeUrlHint: 'URL del sitio web de tu tienda',
      storeDescriptionHint: 'Descripción breve de tu tienda (opcional)',
      storeDescriptionPlaceholder: 'Cuéntale a los clientes sobre tu tienda...',
      businessCategory: 'Categoría del Negocio',
      businessCategoryHint: '¿En qué sector opera tu tienda?',
      businessCategoryPlaceholder: 'Selecciona una categoría',
      businessCategoryOther: 'Otra categoría',
      businessCategoryOtherPlaceholder: 'Escribe tu categoría',
      // Business category options
      categoryFashion: 'Moda',
      categoryElectronics: 'Electrónica',
      categoryBooks: 'Libros',
      categoryHome: 'Hogar',
      categoryOther: 'Otro',
      // Country options
      countryUS: 'Estados Unidos',
      countryCA: 'Canadá',
      countryUK: 'Reino Unido',
      countryDE: 'Alemania',
      countryFR: 'Francia',
      countryES: 'España',
      countryIT: 'Italia',
      countryAU: 'Australia',
      countryJP: 'Japón',
      countryOTHER: 'Otro',
      openingHours: 'Horario de Apertura',
      hasOpeningHours: 'Tengo horario de apertura',
      openingHoursDescription: 'Establece el horario de funcionamiento de tu tienda',
      personalInfoDescription: 'Los detalles de su cuenta personal',
      storeInfoDescription: 'Gestiona los detalles y configuraciones de tu tienda',
      physicalLocationDescription: 'Configura la presencia física de tu tienda',
      emailSignature: 'Firma de Correo',
      emailSignatureDescription: 'Personaliza la firma que aparecerá en tus correos',
      emailSignatureLabel: 'Tu firma',
      emailSignatureBold: 'Negrita (Ctrl+B)',
      emailSignatureItalic: 'Cursiva (Ctrl+I)',
      emailSignatureUnderline: 'Subrayado (Ctrl+U)',
      emailSignatureLink: 'Insertar enlace',
      emailSignatureRemoveFormat: 'Quitar formato',
      emailSignatureLinkPlaceholder: 'https://… o mailto:…',
      emailSignatureInsert: 'Insertar',
      emailSignatureCancel: 'Cancelar',
      phoneHint: '+[código país][número]',
      emailNotifications: 'Este es el correo al que quieres que te lleguen las notificaciones de uso de correos y avisos importantes.',
      inProgress: 'En curso',
      confirmed: 'Confirmadas',
      extra: 'Extra',
      limit: 'Límite',
      trialDaysRemaining: 'días de prueba gratis restantes',
      monday: 'Lunes',
      tuesday: 'Martes',
      wednesday: 'Miércoles',
      thursday: 'Jueves',
      friday: 'Viernes',
      saturday: 'Sábado',
      sunday: 'Domingo',
      addSlot: 'Añadir tramo',
      open: 'Abierto',
      closed: 'Cerrado',
      from: 'Desde',
      to: 'Hasta',
      incompleteProfile: 'Tu perfil está incompleto.',
      incompleteProfileText: 'Rellena los campos obligatorios marcados con * para desbloquear todas las funciones.',
      requiredFields: 'Campos obligatorios',
      trialEndsOn: 'Termina el',
    },
    
    // Plans page
    plans: {
      title: 'Elige tu plan',
      subtitle: 'Selecciona el plan que mejor se adapte a tus necesidades',
      freePlan: 'Plan Free',
      starterPlan: 'Plan Starter',
      proPlan: 'Plan Pro',
      recommended: 'Recomendado',
      perMonth: '/mes',
      conversations: 'por conversación',
      selectPlan: 'Seleccionar plan',
      currentPlan: 'Plan actual',
      upgrade: 'Mejorar plan',
      downgrade: 'Reducir plan',
      free: 'Gratis',
      monthlyLimit: 'Límite mensual',
      unlimited: 'Ilimitado',
      features: 'Características',
      feature1: 'Respuestas automáticas',
      feature2: 'Integración con Shopify',
      feature3: 'Soporte por email',
      feature4: 'Soporte prioritario',
      feature5: 'Análisis avanzado',
      billingCycle: 'Ciclo de facturación',
      conversationsIndicator: 'Conversaciones / tickets',
      monthly: 'Mensual',
      yearly: 'Anual',
      save20: 'Ahorra 20%',
      loadingPlans: 'Cargando planes...',
      noCreditCardRequired: 'No requiere tarjeta de crédito',
      monthlyConversations: 'conversaciones mensuales',
      conversationsCount: 'conversaciones',
      intelligentDrafts: 'Borradores inteligentes con IA',
      intelligentDraftsDesc: 'Nuestro motor de IA genera respuestas automáticas personalizadas para tus clientes. Revisa, ajusta y envía en segundos.',
      connectShopify: 'Conecta tu tienda Shopify',
      connectShopifyDesc: 'Sincroniza pedidos con el bot y gestiona devoluciones o descuentos sin salir de Respondize.',
      unifiedInbox: 'Buzón unificado de atención',
      unifiedInboxDesc: 'Reúne todos tus correos en un solo lugar y obtén una clasificación por tipo de ticket al instante.',
      teamAccess: 'Acceso para un miembro del equipo',
      teamAccessDesc: 'Incluye una plaza de usuario. Los planes superiores amplían el número de miembros.',
      createAccountToSelect: 'Crea una cuenta para seleccionar un plan',
      conversationChangesHelp: 'Cómo funcionan los cambios de conversaciones',
      conversationChangesTitle: 'Cambios de conversaciones: resumen',
      conversationIncreaseInfo: 'el cambio se aplica al final del ciclo',
      conversationDecreaseInfo: 'el cambio también se aplica al final del ciclo',
      conversationChangeCancelInfo: 'Verás el cambio programado y podrás cancelarlo en cualquier momento antes de que se aplique.',
      additionalPacksInfo: 'Puedes comprar packs adicionales si necesitas más conversaciones de forma inmediata en el ciclo actual.',
      increaseConversations: 'Aumentar conversaciones',
      reduceConversations: 'Reducir conversaciones',
      totalMonthly: 'Total mensual:',
      totalMonthlyExpected: 'Total mensual previsto:',
      conversationTooltip: 'Una conversación/ticket es un problema completo resuelto de principio a fin. Solo cuenta cuando la conversación se cierra (el problema queda resuelto), no por cada correo individual.',
      packExtraTooltip: 'Las conversaciones compradas como extra no caducan. Si no se consumen un mes, pasan al mes siguiente. Únicamente son consumidas cuando se llega al límite mensual de conversaciones',
      extraConversations: 'Conversaciones extra:',
      singlePurchase: 'Compra única',
      singlePurchaseDesc: 'Utiliza las conversaciones al instante',
      noExpiration: 'Sin caducidad',
      noExpirationDesc: 'Si no se consumen, se transfieren al mes siguiente',
      buyPack: 'Comprar pack',
      // Calculadora de conversaciones
      calculatorTitle: '¿Cuántas conversaciones necesitas?',
      calculatorInfo: 'Estima cuántas conversaciones necesitas cada mes',
      weeklyEmails: 'Correos que recibes por semana:',
      weeklyEmailsPlaceholder: 'Ej: 150',
      monthlyEmails: 'Correos mensuales:',
      conversationsNeeded: 'Conversaciones necesarias:',
      calculatorTip: '💡 Tip: Redondea hacia arriba para estar cubierto todo el mes',
      // Fin traducciones
      startFree: 'Comenzar gratis',
      freeTrial: 'Prueba gratuita',
      hirePlan: 'Contratar plan',
      processing: 'Procesando...',
      pendingChange: 'Cambio pendiente en otro plan',
      scheduledPlan: 'Plan programado',
      effectiveOn: 'Efectivo el:',
      scheduledChangeTo: 'Cambio programado a',
      scheduledChangeToFree: 'Cambio programado a plan free con 30 conversaciones',
      scheduledChangeToPlan: 'Cambio programado a plan {plan} con {conversations} conversaciones',
      scheduledChangeToConversations: 'Cambio programado a {conversations} conversaciones',
      cancelChange: 'Cancelar cambio',
      changeToFree: 'Cambiar a Free',
      scheduleChangeNextCycle: 'Programar cambio para próximo ciclo',
      planChangeCancelled: 'Cambio de plan cancelado',
      planConversationsChangeCancelled: 'Cambio de plan/conversaciones cancelado',
      changeToFreePlanScheduled: 'Cambio a plan Free programado',
      effectiveOnDate: '(efectivo el {date})',
      effectiveEndOfCycle: 'para fin de ciclo',
      changeToConversationsScheduled: 'Cambio a {conversations} conversaciones programado',
      errorBuyingPack: '❌ Error al comprar el pack',
      errorLoadingPlans: 'No pudimos cargar tus planes',
      errorCancellingChange: 'No se pudo cancelar el cambio',
      errorSchedulingPlanChange: 'Error al programar el cambio de plan',
      errorSelectingFreePlan: 'Error al seleccionar el plan gratuito',
      errorSchedulingChange: 'Error al programar el cambio',
      errorNoCheckoutUrl: 'El backend no devolvió URL de checkout/confirmación.',
      errorProcessingPlan: 'Error al procesar el plan',
    },
    
    // Inbox page
    inbox: {
      title: 'Bandeja de entrada',
      compose: 'Redactar',
      refresh: 'Actualizar',
      markAsRead: 'Marcar como leído',
      markAsUnread: 'Marcar como no leído',
      delete: 'Eliminar',
      archive: 'Archivar',
      noEmails: 'No hay correos',
      noEmailsDescription: 'Tu bandeja de entrada está vacía',
      loading: 'Cargando correos...',
      from: 'De',
      to: 'Para',
      subject: 'Asunto',
      date: 'Fecha',
      filterBy: 'Filtrar por',
      allEmails: 'Todos',
      unread: 'No leídos',
      read: 'Leídos',
      starred: 'Destacados',
      sortBy: 'Ordenar por',
      newest: 'Más recientes',
      oldest: 'Más antiguos',
      
      // Sorting & pagination
      sortByDate: 'Ordenar por fecha',
      ofPage: 'de',
      
      // Empty states
      noEmailsFound: 'No se han encontrado correos',
      adjustSearchTerms: 'Intenta ajustar tus términos de búsqueda',
      
      // Email display
      unknownSender: 'Desconocido',
      noSubject: '(sin asunto)',
      draftBadge: 'Borrador',
      
      // Badges (categories)
      badgePostventa: 'Postventa',
      badgeEnvios: 'Envíos',
      badgeProducto: 'Producto',
      badgeTienda: 'Tienda',
      badgeShopify: 'Shopify',
      badgeComerciales: 'Comerciales',
      badgeOtros: 'Otros',
      
      // Notifications
      errorLoadingEmails: 'Error cargando correos. Inténtalo de nuevo más tarde.',
      shopifyConnectedSuccess: '¡Shopify conectado correctamente! Ya puedes sincronizar pedidos y clientes.',
      
      // Date formatting
      yesterday: 'Ayer',
      sunday: 'Domingo',
      monday: 'Lunes',
      tuesday: 'Martes',
      wednesday: 'Miércoles',
      thursday: 'Jueves',
      friday: 'Viernes',
      saturday: 'Sábado',
    },
    
    // Email page
    email: {
      // Viewer & Navigation
      from: 'De',
      to: 'Para',
      subject: 'Asunto',
      unknown: 'Desconocido',
      noSubject: '(sin asunto)',
      lastReceivedMessage: 'Ultimo mensaje recibido',
      botResponse: 'Respuesta del bot',
      previousConversationHistory: 'Historial anterior con cliente.',
      
      // Reply controls
      writeSubject: 'Escribe el asunto…',
      writeResponse: 'Escribe tu respuesta…',
      send: 'Enviar',
      closeConversation: 'Cerrar Conversacion/Ticket',
      closeConversationTooltip: 'Marca esta opción si esta respuesta cierra la conversación con el cliente',
      attach: 'Adjuntar',
      delete: 'Borrar',
      
      // Attachments
      attachedFiles: 'Archivos adjuntos',
      maxAttachments: 'Máximo 10 adjuntos.',
      fileTooBig: '"{fileName}" es demasiado grande ({fileSize}). Límite ~24 MB por archivo.',
      totalSizeExceeded: 'Superas el límite total (~24 MB). Intento con "{fileName}" → {totalSize}',
      attachmentError: 'No se pudo abrir/descargar el archivo.',
      
      // Preview modal
      previewZoomOut: 'Alejar',
      previewZoomIn: 'Acercar',
      previewZoomReset: 'Tamaño 100%',
      previewZoomFit: 'Ajustar',
      previewClose: 'Cerrar',
      
      // Loading states
      loadingEmail: 'Cargando correo...',
      loadingLargeEmail: 'Cargando email grande ({size}KB)...',
      
      // Shopify Sidebar
      toggleSidebarInfo: 'Mostrar/Ocultar panel de información',
      
      // Order Card
      order: 'Pedido',
      noOrderLinked: 'Sin pedido vinculado',
      multipleOrdersFound: 'Múltiples pedidos encontrados',
      multipleOrdersMessage: 'Se encontraron {count} pedidos para este cliente. Selecciona el correcto:',
      selectOrder: 'Selecciona un pedido...',
      associateOrder: 'Asociar pedido',
      recentOrders: 'Pedidos recientes de este cliente:',
      product: 'Producto',
      refunded: 'Reembolsado',
      refundedPartial: '{refunded} reemb. · {available} disp.',
      total: 'Total',
      orderStatus: 'Estado',
      orderDate: 'Fecha',
      tracking: 'Tracking',
      noTracking: 'Sin tracking',
      viewInShopify: 'Ver en Shopify',
      
      // Order match badges
      matchedByEmail: 'Pedido conectado por: Email',
      matchedByPhone: 'Pedido conectado por: Teléfono',
      matchedByOrder: 'Pedido conectado por: Nº pedido',
      
      // Customer Card
      customer: 'Cliente',
      noCustomerInfo: 'No hay información del cliente disponible',
      customerNameFallback: 'Cliente sin nombre',
      orders: 'Pedidos',
      totalSpent: 'Total gastado',
      
      // Secondary Panels
      orderDetailsPanel: 'Detalles del pedido',
      customerDetailsPanel: 'Detalles del cliente',
      conversationDetailsPanel: 'Detalles de la conversación',
      noProducts: 'Sin productos',
      shippingAddress: 'Dirección de envío',
      billingAddress: 'Dirección de facturación',
      paymentMethod: 'Método de pago',
      orderNote: 'Nota del pedido',
      tags: 'Etiquetas',
      noTags: 'Sin etiquetas',
      shopifyId: 'ID de Shopify',
      fullName: 'Nombre completo',
      phone: 'Teléfono',
      lastOrder: 'Último pedido',
      defaultAddress: 'Dirección por defecto',
      conversationDetailsPanel: 'Detalles de la conversación',
      status: 'Estado',
      inboundMessages: 'Mensajes entrantes',
      outboundMessages: 'Mensajes salientes',
      lastActivity: 'Última actividad',
      matchedBy: 'Match por',
      matchConfidence: 'Confianza del match',
      ambiguous: '¿Ambiguo?',
      yes: 'Sí',
      no: 'No',
      
      // Order Status
      orderStatusPaid: 'Pagado',
      orderStatusPending: 'Pendiente',
      orderStatusRefunded: 'Reembolsado',
      orderStatusPartiallyRefunded: 'Reembolso Parcial',
      orderStatusVoided: 'Anulado',
      orderStatusAuthorized: 'Autorizado',
      
      // Fulfillment Status
      fulfillmentFulfilled: 'Enviado',
      fulfillmentPartial: 'Envío Parcial',
      fulfillmentUnfulfilled: 'Pendiente de Envío',
      
      // Refund Messages
      noRefundableItems: 'No hay items pendientes de reembolso',
      
      // Contextual Header Badges
      conversationStatus: 'Estado Conversación',
      conversationStatusOpen: 'Abierta',
      conversationStatusClosed: 'Cerrada',
      conversationStatusPending: 'Pendiente',
      conversationStatusResolved: 'Resuelta',
      conversationStatusReserved: 'Reservada',
      conversationStatusConfirmed: 'Confirmada',
      conversationStatusCancelled: 'Cancelada',
      confidenceHigh: 'Alta',
      confidenceMedium: 'Media',
      confidenceLow: 'Baja',
      orderConnectedByEmail: 'Pedido conectado por: Email',
      orderConnectedByPhone: 'Pedido conectado por: Teléfono',
      orderConnectedByOrder: 'Pedido conectado por: Nº pedido',
      confidence: 'Confianza',
      
      // Email Classes (Categories)
      classPostventa: 'Postventa',
      classEnvios: 'Envíos',
      classProducto: 'Producto',
      classTienda: 'Tienda',
      classShopify: 'Shopify',
      classComerciales: 'Comerciales',
      classOtros: 'Otros',
      
      // Action Bar
      refund: 'Reembolso',
      modify: 'Modificar',
      trackingAction: 'Tracking',
      discount: 'Descuento',
      
      // Refund Modal
      createRefund: 'Crear Reembolso',
      refundItems: 'Items a reembolsar',
      unfulfilled: 'Sin cumplir',
      restock: 'Reintegrar al inventario',
      refundShipping: 'Reembolsar envío',
      shippingMax: 'Máx.',
      refundReason: 'Razón del reembolso',
      refundReasonPlaceholder: 'Razón del reembolso...',
      refundReasonHelp: 'Solo tú y otros miembros del personal pueden ver esta razón',
      refundSummary: 'Resumen',
      refundSubtotal: 'Subtotal',
      refundShippingAmount: 'Envío',
      refundTotal: 'Total a reembolsar',
      refundMethod: 'Método de reembolso',
      refundMethodOriginal: 'Pago original',
      refundMethodCredit: 'Crédito de tienda',
      refundMethodMixed: 'Pago original y crédito de tienda',
      refundAmount: 'Cantidad a reembolsar',
      refundManual: 'Manual',
      refundAvailable: '{amount} disponible para reembolso',
      refundExceedsAvailable: 'El monto excede el disponible para reembolso',
      refundButton: 'Reembolsar {amount}',
      refundCreating: 'Creando reembolso...',
      refundSuccess: 'Reembolso creado correctamente',
      refundError: 'Error al crear el reembolso',
      refundNoItems: 'No hay items pendientes de reembolso',
      refundNoOrder: 'No hay pedido vinculado o hay múltiples pedidos (selecciona uno primero)',
      refundNoLocation: 'No hay ubicación por defecto para restock. Configúrala primero.',
      refundShippingExceeded: 'No puedes reembolsar más de {max} en shipping',
      
      // Store Credit Warning
      storeCreditWarningTitle: 'Reembolsos con Store Credit',
      storeCreditWarningText: 'Los reembolsos mediante crédito de tienda deben realizarse directamente desde Shopify.',
      openOrderInShopify: 'Abrir pedido en Shopify',
      
      // Discount Modal
      createDiscount: 'Crear código de descuento',
      discountData: 'Datos del descuento',
      discountCode: 'Código de descuento',
      discountCodePlaceholder: 'Ej. GRACIAS10',
      discountCodeHelp: 'Código de 1 solo uso para este cliente.',
      discountType: 'Tipo de descuento',
      discountTypePercent: 'Porcentaje',
      discountTypeAmount: 'Cantidad fija',
      discountValue: 'Valor',
      discountValueHelp: 'Para porcentaje, usa valores entre 0 y 100.',
      discountValueHelpAmount: 'Cantidad fija en la moneda de la tienda.',
      discountSummaryTitle: 'Resumen',
      discountCustomer: 'Cliente',
      discountSummaryMain: 'Define código e importe del descuento',
      discountSummaryPercent: '{value} % de descuento',
      discountSummaryAmount: '{value} {currency} de descuento',
      discountSummaryDetails: '1 uso · sin mínimo de compra · sin combinaciones · activo al crearse.',
      createDiscountButton: 'Crear código',
      discountCreating: 'Creando…',
      openAdvancedDiscounts: 'Abrir descuentos avanzados en Shopify',
      discountCodeEmpty: 'El código de descuento no puede estar vacío.',
      discountValueInvalid: 'Introduce un valor de descuento mayor que 0.',
      discountPercentTooHigh: 'El porcentaje no puede ser mayor que 100.',
      discountSuccess: 'Código de descuento creado correctamente.',
      discountCopied: 'Código copiado al portapapeles',
      discountError: 'Error al crear el descuento.',
      
      // Send/Delete notifications
      sendError: 'Error al enviar el correo ❌',
      sendBodyTooLong: 'El cuerpo del correo supera {limit} caracteres.',
      sendAttachmentsTooLarge: 'Los adjuntos superan el límite (~24 MB). Peso total: {size}.',
      deleteError: 'Error al borrar el email',
      
      // Order association
      associating: 'Asociando...',
      orderAssociatedSuccess: 'Pedido asociado correctamente',
      orderAssociationError: 'Error al asociar pedido: {error}',
      conversationIdNotFound: 'No se encontró conversationId',
      
      // Refund preview/calculation errors
      shopifyIdNotFound: 'No se pudo encontrar el ID de Shopify del pedido',
      refundPreviewError: 'Error al calcular preview',
      refundCalculationError: 'Error al calcular el reembolso',
      refundTransactionNotFound: 'No se pudo determinar la transacción base para reembolso manual',
    },
    
    // Feedback page
    feedback: {
      pageTitle: 'Feedback - Gestor de Correos',
      title: 'Comparte tu Opinión',
      subtitle: 'Tu feedback nos ayuda a mejorar. Cuéntanos qué necesitas o qué podríamos hacer mejor.',
      
      // Message section
      messageLabel: 'Tu mensaje',
      messagePlaceholder: 'Describe tu sugerencia, problema o idea con el mayor detalle posible...',
      
      // Type
      typeLabel: 'Tipo de feedback',
      typeSelectPlaceholder: 'Selecciona una opción',
      typeBug: '🐛 Error / Bug',
      typeFeature: '✨ Nueva funcionalidad',
      typeImprovement: '🚀 Mejora existente',
      typeUI: '🎨 Interfaz / Diseño',
      typePerformance: '⚡ Rendimiento',
      typeOther: '💬 Otro',
      
      // Priority
      priorityLabel: 'Prioridad',
      prioritySelectPlaceholder: '¿Qué tan urgente es?',
      priorityLow: '🟢 Baja - Cuando sea posible',
      priorityMedium: '🟡 Media - Sería útil pronto',
      priorityHigh: '🟠 Alta - Lo necesito pronto',
      priorityCritical: '🔴 Crítica - Bloquea mi trabajo',
      
      // Area
      areaLabel: 'Área afectada',
      areaSelectPlaceholder: '¿Dónde ocurre?',
      areaInbox: '📬 Inbox',
      areaEmail: '📧 Lectura de correos',
      areaCompose: '✍️ Redactar correos',
      areaShopify: '🛍️ Integración Shopify',
      areaProfile: '👤 Perfil',
      areaIntegrations: '🔌 Integraciones',
      areaGeneral: '🌐 General',
      
      // Contact
      emailLabel: 'Tu email (opcional)',
      emailPlaceholder: 'Para recibir actualizaciones...',
      emailHint: 'Si quieres que te informemos cuando implementemos tu sugerencia',
      
      // Attachment
      attachmentLabel: 'Adjuntar captura (opcional)',
      attachmentPlaceholder: 'Próximamente disponible',
      
      // Submit
      submitButton: 'Enviar Feedback',
      submitNote: 'Responderemos lo antes posible. ¡Gracias por ayudarnos a mejorar!',
      
      // Success
      successTitle: '¡Gracias por tu feedback!',
      successMessage: 'Hemos recibido tu mensaje. Lo revisaremos y te responderemos pronto.',
      sendAnother: 'Enviar otro feedback',
      successNotification: '¡Feedback enviado correctamente!',
      
      // Errors
      errorMessageRequired: 'Por favor escribe tu mensaje',
      errorMessageTooShort: 'El mensaje debe tener al menos 10 caracteres',
      errorTypeRequired: 'Por favor selecciona el tipo de feedback',
      errorPriorityRequired: 'Por favor indica la prioridad',
      errorSubmitting: 'Error al enviar el feedback. Inténtalo de nuevo.',
    },
    
    // Compose/Redactar page
    compose: {
      title: 'Redactar correo',
      to: 'Para',
      cc: 'CC',
      bcc: 'CCO',
      subject: 'Asunto',
      message: 'Mensaje',
      send: 'Enviar',
      saveDraft: 'Guardar borrador',
      discard: 'Descartar',
      attachFiles: 'Adjuntar archivos',
      attachments: 'Archivos adjuntos',
      removeAttachment: 'Eliminar adjunto',
      sendingEmail: 'Enviando correo...',
      emailSent: 'Correo enviado correctamente',
      emailError: 'Error al enviar el correo',
      draftSaved: 'Borrador guardado',
      toPlaceholder: 'destinatario@email.com',
      subjectPlaceholder: 'Asunto del correo',
      messagePlaceholder: 'Escribe tu mensaje aquí...',
    },
    
    // Sidebar
    sidebar: {
      inbox: 'Inbox',
      inboxHeader: 'Bandeja de Entrada',
      sent: 'Enviados',
      drafts: 'Borradores',
      archived: 'Archivados',
      deleted: 'Eliminados',
      compose: 'Redactar',
      profile: 'Perfil',
      info: 'Info',
      integrations: 'Integraciones',
      settings: 'Configuración',
      settingsHeader: 'Configuración',
      help: 'Ayuda',
      plans: 'Planes',
      feedback: 'Feedback',
    },
    
    // Info page
    info: {
      title: 'Información',
      pendingIdeas: 'Ideas pendientes',
      noPendingIdeas: 'No hay ideas pendientes',
      howItWorks: 'Cómo funciona',
      faq: 'Preguntas frecuentes',
      support: 'Soporte',
      documentation: 'Documentación',
      tutorials: 'Tutoriales',
      contactUs: 'Contáctanos',
    },
    
    // Integrations page
    integrations: {
      title: 'Integraciones',
      subtitle: 'Conecta Respondize con tus herramientas favoritas',
      emailCategory: 'Correo Electrónico',
      emailCategoryDesc: 'Conecta tu cuenta de correo para gestionar tus emails',
      ecommerceCategory: 'Plataformas E-Commerce',
      ecommerceCategoryDesc: 'Integra tu tienda online para sincronizar pedidos y clientes',
      socialMediaCategory: 'Redes Sociales',
      socialMediaCategoryDesc: 'Conecta tus redes sociales para gestionar mensajes y comentarios',
      othersCategory: 'Otros',
      othersCategoryDesc: 'Más integraciones para potenciar tu flujo de trabajo',
      gmail: 'Gmail',
      gmailDescription: 'Conecta tu cuenta de Gmail para gestionar tus correos',
      outlook: 'Outlook',
      outlookDescription: 'Conecta tu cuenta de Outlook para gestionar tus correos',
      shopify: 'Shopify',
      shopifyDescription: 'Conecta tu tienda Shopify para gestionar pedidos y clientes',
      connected: 'Conectado',
      notConnected: 'No conectado',
      connect: 'Conectar',
      connectGmail: 'Conectar Gmail',
      connectShopify: 'Conectar Shopify',
      disconnect: 'Desconectar',
      disconnecting: 'Desconectando...',
      connecting: 'Conectando...',
      activeIntegration: 'Integración activa',
      comingSoon: 'Próximamente',
      configure: 'Configurar',
      status: 'Estado',
      active: 'Activo',
      inactive: 'Inactivo',
      // Modales
      disconnectGmailTitle: 'Desconectar Gmail',
      disconnectGmailMessage: '¿Estás seguro de que deseas desconectar Gmail?',
      disconnectGmailWarning: 'Dejarás de recibir correos nuevos en Respondize.',
      disconnectShopifyTitle: 'Desconectar Shopify',
      disconnectShopifyMessage: '¿Estás seguro de que deseas desconectar tu tienda Shopify?',
      disconnectShopifyWarning: 'Se perderá el acceso a pedidos y datos de clientes.',
      connectShopifyTitle: 'Conectar tienda Shopify',
      enterShopifyDomain: 'Ingresa el dominio de tu tienda Shopify:',
      shopifyDomainPlaceholder: 'mitienda.myshopify.com',
      shopifyDomainExample: 'Ejemplo: mitienda.myshopify.com',
      cancel: 'Cancelar',
      continue: 'Continuar',
      // Mensajes de error
      errorConnectingGmail: 'Error al conectar con Gmail. Por favor, inténtalo de nuevo.',
      errorDisconnectingGmail: 'Error al desconectar Gmail. Por favor, inténtalo de nuevo.',
      errorConnectingShopify: 'Error al conectar con Shopify. Por favor, inténtalo de nuevo.',
      errorDisconnectingShopify: 'Error al desconectar Shopify. Por favor, inténtalo de nuevo.',
      gmailDisconnected: 'Gmail desconectado correctamente',
      shopifyDisconnected: 'Shopify desconectado correctamente',
      shopifyDomainRequired: 'Por favor ingresa el dominio de tu tienda Shopify',
      gmailConnectedSuccess: '¡Gmail conectado correctamente! Ya puedes recibir correos.',
      shopifyConnectedSuccess: '¡Shopify conectado correctamente! Ya puedes sincronizar pedidos y clientes.',
      // Mensajes de error de callback
      errorAccessDenied: 'Has cancelado la conexión con la tienda.',
      errorInvalidSession: 'La sesión ha expirado. Por favor, inténtalo de nuevo.',
      errorSessionExpired: 'La sesión ha expirado. Por favor, inténtalo de nuevo.',
      errorConnectionFailed: 'Ha ocurrido un error al conectar. Por favor, inténtalo de nuevo.',
      errorNoCode: 'No se recibió código de autorización. Por favor, inténtalo de nuevo.',
      errorGeneric: 'Ha ocurrido un error. Por favor, inténtalo de nuevo.',
      comingSoonInfo: '{product} estará disponible próximamente',
    },

    // Info page (store information)
    info: {
      pageTitle: 'Información sobre la tienda',
      pageSubtitle: 'Completa estos bloques. Puedes marcar campos como No aplicable (N/A). Guardaremos el texto listo para usar y también la configuración para que puedas editarla después.',
      
      // Card titles
      returnsPolicy: 'Política de Devoluciones',
      shippingPolicy: 'Política de Envíos',
      generalInfo: 'Información general de la tienda',
      faq: 'Preguntas Frecuentes',
      
      // Common elements
      important: 'Importante:',
      formDescription: 'este formulario recoge la <em>información mínima</em> para que el bot funcione bien. Si tu política ya incluye estos datos, puedes marcar los campos como <em>"No aplicable (N/A)"</em>. Si falta alguno de estos datos en tu política, complétalos aquí.',
      pastePolicyInstructions: 'Debes pegar tu política completa al final del formulario, para que el bot pueda usarla.',
      notApplicable: '(N/A)',
      fieldsMarkedNA: 'Campos marcados como "No aplican"',
      save: 'Guardar',
      characters: 'caracteres',
      
      // Returns policy fields
      returnsDays: '🗓️ Los clientes disponen de',
      days: 'días',
      naturalDays: 'naturales',
      businessDays: 'laborales',
      toReturnProduct: 'para devolver un producto',
      productState: '📦 Estado en el que debe estar el artículo para ser aceptado como devolución',
      unused: 'Sin usar',
      withTag: 'Con etiqueta',
      originalPackaging: 'Embalaje original',
      sealed: 'Precintado',
      other: 'Otro +',
      specifyOther: 'Especifica \'Otro\'…',
      returnCost: '💸 Coste de devolución',
      customerPays: 'A cargo del cliente',
      storePays: 'Gratis (lo asume la tienda)',
      refundMethod: '↩️ Método de reembolso',
      samePaymentMethod: 'Mismo medio de pago',
      storeCredit: 'Vale de tienda',
      exchangeProduct: 'Cambio por otro producto',
      refundTimeframe: '⏱️ Plazo de reembolso',
      refundTimeText: 'Reembolsamos el dinero aproximadamente en',
      orderCancellation: '🛑 Cuando se puede cancelar un pedido',
      notLeftWarehouse: 'Si no ha salido del almacén',
      withinHours: 'Dentro de las primeras 24 horas',
      returnsPolicyLink: '🔗 Enlace a la política de devoluciones',
      returnsPolicyLinkPlaceholder: 'https://tutienda.com/devoluciones (opcional)',
      yourCompleteReturnsPolicy: 'Tu política completa de devoluciones',
      policyNote: 'Pega aquí <strong>únicamente el texto de tu política</strong>. No añadas instrucciones de comportamiento para el bot, serán ignoradas.',
      pasteReturnsPolicyPlaceholder: 'Pega aquí tu política completa de devoluciones…',
      
      // Shipping policy fields
      rates: '💶 Tarifas',
      zone: 'Zona',
      price: 'Precio',
      time: 'Tiempo',
      notes: 'Notas',
      addRow: '+ Añadir fila',
      shippingZones: '🗺️ Zonas de envío',
      national: 'Nacional (España)',
      eu: 'UE',
      international: 'Internacional',
      specificCountries: 'País/es concretos +',
      specifyCountries: 'Especifica país/es…',
      globalEstimatedTime: '⏱️ Tiempo estimado global',
      orderIds: '📬 Identificadores de pedido',
      trackingProvided: '¿Se proporciona número de seguimiento?',
      yes: 'Sí',
      no: 'No',
      whenTrackingSent: '🕒 ¿Cuándo se envía el seguimiento?',
      whenTrackingSentPlaceholder: 'Ej. al despachar el pedido / 24h después',
      shipmentTracking: '🔎 Seguimiento del envío',
      emailWithLink: 'Email con enlace',
      onWebsite: 'En nuestra página web',
      carrierLink: 'Enlace del transportista',
      trackingUrlPlaceholder: 'URL de seguimiento (opcional)',
      shippingPolicyLink: '🔗 Link a política de envíos',
      shippingPolicyLinkPlaceholder: 'https://tutienda.com/envios (opcional)',
      yourCompleteShippingPolicy: 'Tu política completa de envíos',
      pasteShippingPolicyPlaceholder: 'Pega aquí tu política completa de envíos…',
      
      // General info fields
      generalInfoTip: '🧾 Métodos de pago, ubicación, garantías…',
      paymentMethods: '💳 Métodos de pago aceptados',
      visa: 'Visa',
      mastercard: 'Mastercard',
      paypal: 'PayPal',
      bizum: 'Bizum',
      bankTransfer: 'Transferencia',
      cashOnDelivery: 'Contra reembolso',
      applePay: 'Apple Pay',
      googlePay: 'Google Pay',
      location: '📍 Ubicación',
      online: 'Online',
      physical: 'Física',
      storeAddress: 'Dirección de la tienda',
      addressChange: '🚚 Cambio de dirección tras pedido',
      addressChangeConditions: '¿Bajo qué condiciones el cliente puede cambiar la dirección de envío?¿Y qué plazo tiene para ello?',
      addressChangePlaceholder: 'Condiciones / plazo',
      sizeChart: '📏 Tabla de tallas',
      sizeChartLocation: 'Dónde se encuentra?',
      warranty: '🛡️ Garantía',
      noWarranty: 'Sin garantía',
      warrantyDays: 'Días',
      warrantyMonths: 'Meses',
      warrantyYears: 'Años',
      duration: 'Duración:',
      
      // FAQ fields
      faqTip: 'Aquí configuras tus Preguntas Frecuentes. Escribe la <strong>pregunta de forma literal</strong> y una <strong>respuesta exacta</strong> tal y como quieres que la vea el cliente.',
      notApply: 'No aplican',
      addQuestion: '+ Añadir pregunta',
      
      // Sidebar
      sidebarTitle: 'Propuestas de información a añadir',
      showPanel: 'Mostrar panel',
      loadingMessages: 'Cargando mensajes…',
      noEmailsProcessed: 'No hay correos procesados todavía.',
      
      // Loading states
      savingYourInfo: 'guardando tu información...',
      validatingFields: 'validando campos...',
      updatingDatabase: 'actualizando la base de datos...',
      preparingConfirmation: 'preparando confirmación...',
      weAre: 'Estamos',
      
      // Success/Error messages
      congratulations: '¡Felicidades, ya se ha guardado tu información! 🎉',
      policyExceedsLimit: 'La política pegada supera el máximo de 6000 caracteres.',
      addInfoOrPastePolicy: 'Añade información en el formulario o pega tu política.',
      botInstructionDetected: 'Se ha detectado una instrucción al bot en la información subida y se ha ignorado ese tramo.',
      policySavedPartially: 'Se ha guardado la política parcialmente, algunas reglas se han obviado.',
      errorSavingPolicy: 'Error al guardar la política.',
      missingQuestion: 'Falta la pregunta en el bloque #{number}',
      missingAnswer: 'Falta la respuesta en el bloque #{number}',
      addAtLeastOneQuestion: 'Añade al menos una pregunta.',
      botInstructionInAnswer: 'Se ha detectado una instrucción al bot en alguna respuesta y se ha ignorado ese tramo.',
      unexpectedResponseSavingFAQ: 'Respuesta inesperada al guardar FAQs.',
      errorSavingFAQ: 'Error al guardar FAQs.',
      ideaDeleted: 'Idea eliminada de pendientes',
      couldNotDeleteIdea: 'No se pudo eliminar la idea',
      faqEntryDiscarded: 'La entrada de FAQ se descartó (contenido inválido/filtrado).',
      invalidPartsIgnored: 'Se ignoraron partes potencialmente inválidas de la respuesta.',
      questionCannotBeEmpty: 'La pregunta no puede estar vacía',
      addAnswer: 'Añade una respuesta',
      questionExceedsLimit: 'La pregunta supera el máximo de {limit} caracteres.',
      answerExceedsLimit: 'La respuesta supera el máximo de {limit} caracteres.',
      questionSaved: 'Pregunta guardada en FAQ',
    },
    
    // Shopify pages
    shopify: {
      loadingTitle: '¡Conectando tu tienda! ✨',
      loadingMessage: 'Estamos configurando tu cuenta de Respondize',
      subscriptionConfirmed: '¡Todo listo! Redirigiendo...',
      subscriptionFailed: 'Hubo un problema con la suscripción',
      subscriptionExpired: 'El tiempo de confirmación ha expirado',
      subscriptionNotFound: 'No se encontró la solicitud de suscripción',
      subscriptionPending: 'Preparando tu cuenta...',
      tokenNotFound: 'No se encontró el token de confirmación',
      errorVerifying: 'Error al verificar el estado de la suscripción',
      takingTooLong: 'Esto está tardando un poco más de lo normal...',
      redirecting: 'Redirigiendo...',
      loginWithShopify: 'Iniciar sesión con Shopify',
      registerWithShopify: 'Registrarse con Shopify',
      connectShopify: 'Conectar con Shopify',
      shopifyStore: 'Tienda Shopify',
      shopifyStorePlaceholder: 'tu-tienda.myshopify.com',
      ready: '¡Tu cuenta está lista! ✨',
      loggingIn: 'Conectando con tu tienda de Shopify...',
      sessionExpired: 'Tu sesión ha expirado. Por favor, accede nuevamente desde Shopify.',
      preparingAccount: 'Configurando tu cuenta de Respondize...',
      waitingConfirmation: 'Esperando confirmación de Shopify...',
    },
    
    // Error messages
    errors: {
      generic: 'Ha ocurrido un error',
      networkError: 'Error de conexión',
      unauthorized: 'No autorizado',
      forbidden: 'Acceso denegado',
      notFound: 'No encontrado',
      serverError: 'Error del servidor',
      validationError: 'Error de validación',
      requiredField: 'Este campo es requerido',
      invalidEmail: 'Correo electrónico inválido',
      invalidPassword: 'Contraseña inválida',
      passwordMismatch: 'Las contraseñas no coinciden',
      minLength: 'Longitud mínima no alcanzada',
      maxLength: 'Longitud máxima excedida',
    },
    
    // Success messages
    success: {
      saved: 'Guardado correctamente',
      updated: 'Actualizado correctamente',
      deleted: 'Eliminado correctamente',
      created: 'Creado correctamente',
      sent: 'Enviado correctamente',
    },
    
    // Notifications
    notifications: {
      newEmail: 'Nuevo correo recibido',
      emailSent: 'Correo enviado',
      draftSaved: 'Borrador guardado',
      profileUpdated: 'Perfil actualizado',
      planChanged: 'Plan actualizado',
      integrationConnected: 'Integración conectada',
      integrationDisconnected: 'Integración desconectada',
    },
    
    // Onboarding
    onboarding: {
      welcome: 'Bienvenido a Respondize',
      letsGetStarted: 'Comencemos',
      step1: 'Completa tu perfil',
      step2: 'Conecta tu tienda',
      step3: 'Configura respuestas',
      skip: 'Saltar',
      finish: 'Finalizar',
      // Referral code section
      referralCodeTitle: '¿Tienes un código de referido?',
      referralCodeSubtitle: 'Si alguien te invitó o tienes un código de un partner, ingrésalo aquí',
      referralCodePlaceholder: 'Ingresa tu código',
      validateCode: 'Validar',
      applyCode: 'Aplicar código',
      codeValidating: 'Validando código...',
      codeApplying: 'Aplicando código...',
      codeInvalid: 'Código inválido o inactivo',
      codeValidUser: '+10 conversaciones para ti y +10 para quien te invitó (al pasar a pago)',
      codeValidPartner: '+15 conversaciones para ti (al pasar a pago)',
      codeApplied: 'Código aplicado. Las conversaciones se añadirán automáticamente cuando pases a un plan de pago.',
      codeAlreadyApplied: 'Ya tienes un código aplicado',
      codeCannotChange: 'No puedes cambiar el código una vez aplicado',
      rewardPending: 'Recompensa pendiente: se activará al pasar a plan de pago',
      conversationsWhenPaid: 'conversaciones se añadirán automáticamente a tus conversaciones extra cuando pases a un plan de pago',
    },
    
    // Badge labels (email classification)
    badges: {
      postventa: 'Postventa',
      envios: 'Envíos',
      producto: 'Producto',
      tienda: 'Tienda',
      shopify: 'Shopify',
      comerciales: 'Comerciales',
      otros: 'Otros',
    },

    // Referrals section
    referrals: {
      sectionTitle: 'Programa de Referidos',
      sectionDescription: 'Invita a otros y gana conversaciones extra gratis',
      myCodeTitle: 'Mi código de referido',
      myCodeDescription: 'Comparte este código con amigos y tiendas',
      copyCode: 'Copiar código',
      codeCopied: 'Código copiado al portapapeles',
      noCodeYet: 'Completa el onboarding para obtener tu código',
      statsTitle: 'Mis estadísticas',
      totalInvites: 'Total de invitados',
      invitesPaid: 'Invitados en pago',
      invitesTrial: 'Invitados en prueba',
      conversationsEarned: 'Conversaciones ganadas',
      invitedStores: 'Tiendas invitadas',
      storeName: 'Tienda',
      email: 'Email',
      status: 'Estado',
      statusTrial: 'En prueba',
      statusPaid: 'Pagando',
      rewardPending: 'La recompensa se aplicará al pasar a pago',
      noInvitesYet: 'Aún no has invitado a nadie. ¡Comparte tu código!',
      loadingStats: 'Cargando estadísticas...',
      errorLoadingStats: 'Error al cargar estadísticas',
      createdAt: 'Creado',
      signedUpAt: 'Registro',
      conversationsGranted: 'Conversaciones otorgadas',
    },
  },
  
  en: {
    // Common
    common: {
      loading: 'Loading...',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      close: 'Close',
      continue: 'Continue',
      back: 'Back',
      next: 'Next',
      previous: 'Previous',
      yes: 'Yes',
      no: 'No',
      ok: 'OK',
      error: 'Error',
      success: 'Success',
      warning: 'Warning',
      info: 'Information',
      search: 'Search',
      filter: 'Filter',
      sort: 'Sort',
      select: 'Select',
      upload: 'Upload',
      download: 'Download',
      required: 'Required',
      optional: 'Optional',
      confirm: 'Confirm',
      send: 'Send',
      refresh: 'Refresh',
      view: 'View',
      more: 'More',
      less: 'Less',
      all: 'All',
      none: 'None',
      apply: 'Apply',
      reset: 'Reset',
      clear: 'Clear',
      add: 'Add',
      remove: 'Remove',
      copy: 'Copy',
      paste: 'Paste',
      cut: 'Cut',
      undo: 'Undo',
      redo: 'Redo',
      active: 'Active',
      inactive: 'Inactive',
      enabled: 'Enabled',
      disabled: 'Disabled',
      or: 'or',
      and: 'and',
      validating: 'Validating...',
      applying: 'Applying...',
    },
    
    // Navbar
    navbar: {
      features: 'Features',
      howItWorks: 'How it works',
      pricing: 'Pricing',
      faq: 'FAQ',
      login: 'Log in',
      logout: 'Log out',
      joinFree: 'Join for free',
      backToProfile: 'Back to profile',
      backToHome: 'Back to home',
    },
    
    // Landing page
    landing: {
      heroTitle: 'Fast and human e-commerce customer support',
      heroSubtitle: 'Reduce response time by up to 60% and dedicate more time to what matters',
      startFree: 'Join for free',
      noCreditCard: 'No credit card required',
      freeTrial: 'Free trial',
      tryNow: 'Try now',
      learnMore: 'Learn more',
      getStarted: 'Get started',
      watchDemo: 'Watch demo',
      joinNow: 'Join now',
      trustedBy: 'Trusted by companies',
      featuredIn: 'Featured in',
      videoDemo: 'Video Demo coming soon',
      securityFirst: 'Security and privacy first',
      securityDescription: 'We comply with the General Data Protection Regulation (GDPR) and have Google\'s security verification (CASA Tier 2), required for apps with access to restricted data.',
      featuredBenefits: 'Featured Benefits',
      responses247: '24/7 Responses',
      responses247Desc: 'Respondize never rests: it generates drafts and responses day and night so you can focus on what really matters. When you enter your inbox, everything is ready to review and send.',
      doublePerformance: 'Double your team\'s performance',
      doublePerformanceDesc: 'Our first testers are seeing improvements of up to 60% in the number of conversations they resolve per day with the same team. Respondize handles repetitive responses and your team handles higher-value cases.',
      connectedResponses: 'Responses connected to orders',
      connectedResponsesDesc: 'If you work with Shopify, you can connect your store so Respondize can query orders, shipping status... This way you manage returns, changes and incidents without leaving the email itself.',
      quickOnboarding: 'Onboarding in less than 10 minutes',
      quickOnboardingDesc: 'Connect your email, upload your policies and answer a few questions about your business. No installations, no code and no IT projects: in less than 10 minutes you have Respondize ready to help.',
      helpfulMetrics: 'Metrics that actually help decide',
      helpfulMetricsDesc: 'See response times, contact reasons and volume by query type to decide where to automate more and where to reinforce your team. (Available soon).',
      howItWorksTitle: 'How it works',
      step1Title: 'Connect your store',
      step1Desc: 'Upload information about your products, policies and FAQs so Respondize knows your business.',
      step2Title: 'Queries arrive',
      step2Desc: 'Your customers send questions from Gmail (Outlook coming soon) directly to your inbox.',
      step3Title: 'Respondize generates response',
      step3Desc: 'Respondize analyzes the context and drafts a personalized response in a couple of minutes.',
      step4Title: 'You approve and send',
      step4Desc: 'Review, edit if you want, and send with one click. You have total control over each response.',
      storeOnline: 'Online Store',
      storeDescription: 'Upload your store information',
      customer: 'Customer',
      customerSends: 'Sends query',
      aiBot: 'Respondize',
      aiProcesses: 'Processes and drafts',
      you: 'You',
      youReview: 'Review and approve',
      generatedDraft: 'Generated draft',
      inbox: 'Inbox',
      faqTitle: 'Frequently Asked Questions',
      faq1Question: 'Is my information secure?',
      faq1Answer: 'Yes. Users log in with email and password and these are stored in hashed form (we don\'t save the password in plain text). The connection with Gmail and other services is made through official OAuth and data is encrypted both in transit and at rest. Respondize is designed to comply with GDPR and has passed Google\'s CASA Tier 2 security verification for apps with access to restricted data. Your emails are not used to train global AI models.',
      faq2Question: 'Do I have human control?',
      faq2Answer: 'Always. Respondize generates drafts and automatic responses, but you decide what gets sent. You can review, edit and approve each message, or limit automation to certain types of queries. The tool adapts to the level of control you want to maintain.',
      faq3Question: 'How are conversations counted?',
      faq3Answer: 'We count conversations (tickets) when a problem is marked as resolved in Respondize. That is, each resolved conversation consumes one unit of your monthly usage. While a case remains open or in follow-up, it is not counted again. If you need more capacity, you can expand it with additional packs.',
      faq5Answer: 'Yes. You can cancel your subscription whenever you want from the account panel. You will not be charged for the next billing cycle and, after a period of 2 months of inactivity, we will delete your data to comply with European data protection regulations, unless the law requires us to keep them longer.',
      faq6Question: 'What integrations does it include?',
      faq6Answer: 'Currently Respondize integrates with Gmail and Shopify, which allows you to respond to your customers with order data, returns and shipping status directly from email. We are working on Outlook integration and, later, on channels like Instagram or WhatsApp Business to centralize all customer service in one place.',
      ctaTitle: 'Gain time for what really matters',
      ctaSubtitle: 'Leave the repetitive work in our hands and dedicate your day to customers, product and growth.',
      ctaButton: 'Start for free',
      footerTagline: 'Transforming customer service with AI',
      footerProduct: 'Product',
      footerFeatures: 'Features',
      footerPricing: 'Pricing',
      footerFaq: 'FAQ',
      footerLegal: 'Legal',
      footerSocial: 'Social',
      footerPrivacy: 'Privacy',
      footerTerms: 'Terms',
      footerDisclaimer: 'Respondize processes your emails in real time to generate personalized responses and does not use your data to train global AI models. Check our Privacy Policy for more details.',
      footerCopyright: '© 2024 Respondize. All rights reserved.',
      modalTitle: 'Before you start: you will need to authorize Respondize on Google',
      modalDescription: 'In the next step you can see the Google screen to grant permissions securely. It is necessary to connect your account and for Respondize to work 100%.',
      modalCaption: 'In the image you can see why we request each permission.',
      modalContinue: 'Continue',
    },
    
    // Auth pages
    auth: {
      login: 'Log in',
      loginTitle: 'Log in to your account',
      loginSubtitle: 'Continue managing your emails intelligently',
      register: 'Sign up',
      registerTitle: 'Create your account',
      email: 'Email',
      password: 'Password',
      confirmPassword: 'Confirm password',
      forgotPassword: 'Forgot your password?',
      resetPassword: 'Reset password',
      authFooterText: 'By logging in, you agree to our',
      termsOfService: 'Terms of Service',
      and: 'and',
      privacyPolicy: 'Privacy Policy',
      backToHome: 'Back to home page',
      noAccount: "Don't have an account?",
      haveAccount: 'Already have an account?',
      createAccount: 'Create account',
      loginHere: 'Log in here',
      registerHere: 'Sign up here',
      sendResetLink: 'Send reset link',
      backToLogin: 'Back to login',
      verifyEmail: 'Verify email',
      verifyEmailMessage: 'We sent you a verification email',
      resendEmail: 'Resend email',
      emailPlaceholder: 'you@email.com',
      passwordPlaceholder: 'Enter your password',
      confirmPasswordPlaceholder: 'Confirm your password',
      loginWithShopify: 'Log in with Shopify',
      registerWithShopify: 'Sign up with Shopify',
      orContinueWith: 'Or continue with',
      website: 'Website',
      websitePlaceholder: 'www.yourwebsite.com',
      createSecurePassword: 'Create a secure password',
      confirmYourPassword: 'Confirm your password',
      showPassword: 'Show password',
      passwordStrengthWeak: 'Weak password',
      passwordStrengthFair: 'Fair password',
      passwordStrengthGood: 'Good password',
      passwordStrengthStrong: 'Strong password!',
      enterYourPassword: 'Enter your password',
      agreeToTerms: 'I agree to the',
      termsOfService: 'Terms of Service',
      and: 'and',
      privacyPolicy: 'Privacy Policy',
      startManagingEmails: 'Start managing your emails intelligently',
    },
    
    // Profile page
    profile: {
      title: 'User Profile',
      storeInfo: 'Store Information',
      personalInfo: 'Personal Information',
      preferences: 'Preferences',
      storeName: 'Store Name *',
      storeUrl: 'Store URL',
      storeDescription: 'Store Description',
      hasPhysicalLocation: 'My store has a physical location',
      physicalLocation: 'Physical Location',
      address: 'Address *',
      city: 'City *',
      state: 'State/Province *',
      zip: 'ZIP Code',
      country: 'Country *',
      phone: 'Phone',
      firstName: 'First Name *',
      lastName: 'Last Name *',
      language: 'Language',
      timezone: 'Time Zone',
      saveChanges: 'Save Changes',
      cancelChanges: 'Cancel',
      changingsSaved: 'Changes saved successfully',
      errorSaving: 'Error saving changes',
      managePlan: 'Manage plan',
      currentPlan: 'Current plan',
      deleteAccount: 'Delete account',
      deleteAccountConfirm: 'Are you sure you want to delete your account?',
      accountDeleted: 'Account deleted successfully',
      spanish: 'Spanish',
      english: 'English',
      storeNameHint: 'This is how your store will appear to customers',
      storeUrlHint: 'Your store website URL',
      storeDescriptionHint: 'Brief description of your store (optional)',
      storeDescriptionPlaceholder: 'Tell customers about your store...',
      businessCategory: 'Business Category',
      businessCategoryHint: 'What sector does your store operate in?',
      businessCategoryPlaceholder: 'Select a category',
      businessCategoryOther: 'Other category',
      businessCategoryOtherPlaceholder: 'Enter your category',
      // Business category options
      categoryFashion: 'Fashion',
      categoryElectronics: 'Electronics',
      categoryBooks: 'Books',
      categoryHome: 'Home & Garden',
      categoryOther: 'Other',
      // Country options
      countryUS: 'United States',
      countryCA: 'Canada',
      countryUK: 'United Kingdom',
      countryDE: 'Germany',
      countryFR: 'France',
      countryES: 'Spain',
      countryIT: 'Italy',
      countryAU: 'Australia',
      countryJP: 'Japan',
      countryOTHER: 'Other',
      openingHours: 'Opening Hours',
      hasOpeningHours: 'I have opening hours',
      openingHoursDescription: 'Set your store operating hours',
      personalInfoDescription: 'Your personal account details',
      storeInfoDescription: 'Manage your store details and settings',
      physicalLocationDescription: 'Configure your store physical presence',
      emailSignature: 'Email Signature',
      emailSignatureDescription: 'Customize the signature that will appear in your emails',
      emailSignatureLabel: 'Your signature',
      emailSignatureBold: 'Bold (Ctrl+B)',
      emailSignatureItalic: 'Italic (Ctrl+I)',
      emailSignatureUnderline: 'Underline (Ctrl+U)',
      emailSignatureLink: 'Insert link',
      emailSignatureRemoveFormat: 'Remove format',
      emailSignatureLinkPlaceholder: 'https://… or mailto:…',
      emailSignatureInsert: 'Insert',
      emailSignatureCancel: 'Cancel',
      phoneHint: '+[country code][number]',
      emailNotifications: 'This is the email where you want to receive usage notifications and important notices.',
      inProgress: 'In progress',
      confirmed: 'Confirmed',
      extra: 'Extra',
      limit: 'Limit',
      trialDaysRemaining: 'free trial days remaining',
      monday: 'Monday',
      tuesday: 'Tuesday',
      wednesday: 'Wednesday',
      thursday: 'Thursday',
      friday: 'Friday',
      saturday: 'Saturday',
      sunday: 'Sunday',
      addSlot: 'Add time slot',
      open: 'Open',
      closed: 'Closed',
      from: 'From',
      to: 'To',
      incompleteProfile: 'Your profile is incomplete.',
      incompleteProfileText: 'Fill in the required fields marked with * to unlock all features.',
      requiredFields: 'Required fields',
      trialEndsOn: 'Ends on',
    },
    
    // Plans page
    plans: {
      title: 'Choose your plan',
      subtitle: 'Select the plan that best fits your needs',
      freePlan: 'Free Plan',
      starterPlan: 'Starter Plan',
      proPlan: 'Pro Plan',
      recommended: 'Recommended',
      perMonth: '/month',
      conversations: 'conversations',
      selectPlan: 'Select plan',
      currentPlan: 'Current plan',
      upgrade: 'Upgrade',
      downgrade: 'Downgrade',
      free: 'Free',
      monthlyLimit: 'Monthly limit',
      unlimited: 'Unlimited',
      features: 'Features',
      feature1: 'Automatic responses',
      feature2: 'Shopify integration',
      feature3: 'Email support',
      feature4: 'Priority support',
      feature5: 'Advanced analytics',
      billingCycle: 'Billing cycle',
      conversationsIndicator: 'Conversations / tickets',
      monthly: 'Monthly',
      yearly: 'Yearly',
      save20: 'Save 20%',
      loadingPlans: 'Loading plans...',
      noCreditCardRequired: 'No credit card required',
      monthlyConversations: 'monthly conversations',
      conversationsCount: 'conversations',
      intelligentDrafts: 'Intelligent AI drafts',
      intelligentDraftsDesc: 'Our AI engine generates personalized automated responses for your customers. Review, adjust and send in seconds.',
      connectShopify: 'Connect your Shopify store',
      connectShopifyDesc: 'Sync orders with the bot and manage returns or discounts without leaving Respondize.',
      unifiedInbox: 'Unified support inbox',
      unifiedInboxDesc: 'Bring all your emails together in one place and get instant ticket type classification.',
      teamAccess: 'Access for one team member',
      teamAccessDesc: 'Includes one user seat. Higher plans expand the number of members.',
      createAccountToSelect: 'Create an account to select a plan',
      conversationChangesHelp: 'How conversation changes work',
      conversationChangesTitle: 'Conversation changes: summary',
      conversationIncreaseInfo: 'the change applies at the end of the cycle',
      conversationDecreaseInfo: 'the change also applies at the end of the cycle',
      conversationChangeCancelInfo: "You'll see the scheduled change and can cancel it at any time before it's applied.",
      additionalPacksInfo: 'You can purchase additional packs if you need more conversations immediately in the current cycle.',
      increaseConversations: 'Increase conversations',
      reduceConversations: 'Reduce conversations',
      totalMonthly: 'Monthly total:',
      totalMonthlyExpected: 'Expected monthly total:',
      conversations: 'per conversation',
      conversationTooltip: 'A conversation/ticket is a complete problem solved from start to finish. It only counts when the conversation is closed (the problem is resolved), not for each individual email.',
      packExtraTooltip: 'Extra purchased conversations do not expire. If they are not consumed in one month, they carry over to the next month. They are only consumed when the monthly conversation limit is reached',
      extraConversations: 'Extra conversations:',
      singlePurchase: 'Single purchase',
      singlePurchaseDesc: 'Use the conversations instantly',
      noExpiration: 'No expiration',
      noExpirationDesc: 'If not consumed, they transfer to the next month',
      buyPack: 'Buy pack',
      // Calculator translations
      calculatorTitle: 'How many conversations do you need?',
      calculatorInfo: 'Estimate how many conversations you need each month',
      weeklyEmails: 'Emails you receive per week:',
      weeklyEmailsPlaceholder: 'Ex: 150',
      monthlyEmails: 'Monthly emails:',
      conversationsNeeded: 'Conversations needed:',
      calculatorTip: '💡 Tip: Round up to be covered all month',
      // End translations
      calculatorTip: '💡 Tip: Round up to be covered all month',
      // End translations
      startFree: 'Start free',
      freeTrial: 'Free trial',
      hirePlan: 'Hire plan',
      processing: 'Processing...',
      pendingChange: 'Pending change in another plan',
      scheduledPlan: 'Scheduled plan',
      effectiveOn: 'Effective on:',
      scheduledChangeTo: 'Scheduled change to',
      scheduledChangeToFree: 'Scheduled change to free plan with 30 conversations',
      scheduledChangeToPlan: 'Scheduled change to {plan} plan with {conversations} conversations',
      scheduledChangeToConversations: 'Scheduled change to {conversations} conversations',
      cancelChange: 'Cancel change',
      changeToFree: 'Change to Free',
      scheduleChangeNextCycle: 'Schedule change for next cycle',
      planChangeCancelled: 'Plan change cancelled',
      planConversationsChangeCancelled: 'Plan/conversations change cancelled',
      changeToFreePlanScheduled: 'Change to Free plan scheduled',
      effectiveOnDate: '(effective on {date})',
      effectiveEndOfCycle: 'at end of cycle',
      changeToConversationsScheduled: 'Change to {conversations} conversations scheduled',
      errorBuyingPack: '❌ Error buying pack',
      errorLoadingPlans: 'Could not load your plans',
      errorCancellingChange: 'Could not cancel the change',
      errorSchedulingPlanChange: 'Error scheduling plan change',
      errorSelectingFreePlan: 'Error selecting free plan',
      errorSchedulingChange: 'Error scheduling change',
      errorNoCheckoutUrl: 'Backend did not return checkout/confirmation URL.',
      errorProcessingPlan: 'Error processing plan',
    },
    
    // Inbox page
    inbox: {
      title: 'Inbox',
      compose: 'Compose',
      refresh: 'Refresh',
      markAsRead: 'Mark as read',
      markAsUnread: 'Mark as unread',
      delete: 'Delete',
      archive: 'Archive',
      noEmails: 'No emails',
      noEmailsDescription: 'Your inbox is empty',
      loading: 'Loading emails...',
      from: 'From',
      to: 'To',
      subject: 'Subject',
      date: 'Date',
      filterBy: 'Filter by',
      allEmails: 'All',
      unread: 'Unread',
      read: 'Read',
      starred: 'Starred',
      sortBy: 'Sort by',
      newest: 'Newest',
      oldest: 'Oldest',
      
      // Sorting & pagination
      sortByDate: 'Sort by date',
      ofPage: 'of',
      
      // Empty states
      noEmailsFound: 'No emails found',
      adjustSearchTerms: 'Try adjusting your search terms',
      
      // Email display
      unknownSender: 'Unknown',
      noSubject: '(no subject)',
      draftBadge: 'Draft',
      
      // Badges (categories)
      badgePostventa: 'After-sales',
      badgeEnvios: 'Shipping',
      badgeProducto: 'Product',
      badgeTienda: 'Store',
      badgeShopify: 'Shopify',
      badgeComerciales: 'Sales',
      badgeOtros: 'Others',
      
      // Notifications
      errorLoadingEmails: 'Error loading emails. Please try again later.',
      shopifyConnectedSuccess: 'Shopify connected successfully! You can now sync orders and customers.',
      
      // Date formatting
      yesterday: 'Yesterday',
      sunday: 'Sunday',
      monday: 'Monday',
      tuesday: 'Tuesday',
      wednesday: 'Wednesday',
      thursday: 'Thursday',
      friday: 'Friday',
      saturday: 'Saturday',
    },
    
    // Email page
    email: {
      // Viewer & Navigation
      from: 'From',
      to: 'To',
      subject: 'Subject',
      unknown: 'Unknown',
      noSubject: '(no subject)',
      lastReceivedMessage: 'Last received message',
      botResponse: 'Bot response',
      previousConversationHistory: 'Previous conversation history with customer.',
      
      // Reply controls
      writeSubject: 'Write the subject…',
      writeResponse: 'Write your response…',
      send: 'Send',
      closeConversation: 'Close Conversation/Ticket',
      closeConversationTooltip: 'Check this option if this response closes the conversation with the customer',
      attach: 'Attach',
      delete: 'Delete',
      
      // Attachments
      attachedFiles: 'Attached files',
      maxAttachments: 'Maximum 10 attachments.',
      fileTooBig: '"{fileName}" is too large ({fileSize}). Limit ~24 MB per file.',
      totalSizeExceeded: 'Total size exceeded (~24 MB). Trying with "{fileName}" → {totalSize}',
      attachmentError: 'Could not open/download the file.',
      
      // Preview modal
      previewZoomOut: 'Zoom out',
      previewZoomIn: 'Zoom in',
      previewZoomReset: '100% size',
      previewZoomFit: 'Fit',
      previewClose: 'Close',
      
      // Loading states
      loadingEmail: 'Loading email...',
      loadingLargeEmail: 'Loading large email ({size}KB)...',
      
      // Shopify Sidebar
      toggleSidebarInfo: 'Show/Hide information panel',
      
      // Order Card
      order: 'Order',
      noOrderLinked: 'No order linked',
      multipleOrdersFound: 'Multiple orders found',
      multipleOrdersMessage: 'Found {count} orders for this customer. Select the correct one:',
      selectOrder: 'Select an order...',
      associateOrder: 'Associate order',
      recentOrders: 'Recent orders for this customer:',
      product: 'Product',
      refunded: 'Refunded',
      refundedPartial: '{refunded} ref. · {available} avail.',
      total: 'Total',
      orderStatus: 'Status',
      orderDate: 'Date',
      tracking: 'Tracking',
      noTracking: 'No tracking',
      viewInShopify: 'View in Shopify',
      
      // Order match badges
      matchedByEmail: 'Order matched by: Email',
      matchedByPhone: 'Order matched by: Phone',
      matchedByOrder: 'Order matched by: Order number',
      
      // Customer Card
      customer: 'Customer',
      noCustomerInfo: 'No customer information available',
      customerNameFallback: 'Customer without name',
      orders: 'Orders',
      totalSpent: 'Total spent',
      
      // Secondary Panels
      orderDetailsPanel: 'Order details',
      customerDetailsPanel: 'Customer details',
      conversationDetailsPanel: 'Conversation details',
      noProducts: 'No products',
      shippingAddress: 'Shipping address',
      billingAddress: 'Billing address',
      paymentMethod: 'Payment method',
      orderNote: 'Order note',
      tags: 'Tags',
      noTags: 'No tags',
      shopifyId: 'Shopify ID',
      fullName: 'Full name',
      phone: 'Phone',
      lastOrder: 'Last order',
      defaultAddress: 'Default address',
      conversationDetailsPanel: 'Conversation details',
      status: 'Status',
      inboundMessages: 'Inbound messages',
      outboundMessages: 'Outbound messages',
      lastActivity: 'Last activity',
      matchedBy: 'Matched by',
      matchConfidence: 'Match confidence',
      ambiguous: 'Ambiguous?',
      yes: 'Yes',
      no: 'No',
      
      // Order Status
      orderStatusPaid: 'Paid',
      orderStatusPending: 'Pending',
      orderStatusRefunded: 'Refunded',
      orderStatusPartiallyRefunded: 'Partially Refunded',
      orderStatusVoided: 'Voided',
      orderStatusAuthorized: 'Authorized',
      
      // Fulfillment Status
      fulfillmentFulfilled: 'Fulfilled',
      fulfillmentPartial: 'Partially Fulfilled',
      fulfillmentUnfulfilled: 'Unfulfilled',
      
      // Refund Messages
      noRefundableItems: 'No items available for refund',
      
      // Contextual Header Badges
      conversationStatus: 'Conversation Status',
      conversationStatusOpen: 'Open',
      conversationStatusClosed: 'Closed',
      conversationStatusPending: 'Pending',
      conversationStatusResolved: 'Resolved',
      conversationStatusReserved: 'Reserved',
      conversationStatusConfirmed: 'Confirmed',
      conversationStatusCancelled: 'Cancelled',
      confidenceHigh: 'High',
      confidenceMedium: 'Medium',
      confidenceLow: 'Low',
      orderConnectedByEmail: 'Order connected by: Email',
      orderConnectedByPhone: 'Order connected by: Phone',
      orderConnectedByOrder: 'Order connected by: Order number',
      confidence: 'Confidence',
      
      // Email Classes (Categories)
      classPostventa: 'After Sales',
      classEnvios: 'Shipping',
      classProducto: 'Product',
      classTienda: 'Store',
      classShopify: 'Shopify',
      classComerciales: 'Commercial',
      classOtros: 'Others',
      
      // Action Bar
      refund: 'Refund',
      modify: 'Modify',
      trackingAction: 'Tracking',
      discount: 'Discount',
      
      // Refund Modal
      createRefund: 'Create Refund',
      refundItems: 'Items to refund',
      unfulfilled: 'Unfulfilled',
      restock: 'Restock',
      refundShipping: 'Refund shipping',
      shippingMax: 'Max.',
      refundReason: 'Reason for refund',
      refundReasonPlaceholder: 'Reason for refund...',
      refundReasonHelp: 'Only you and other staff can see this reason',
      refundSummary: 'Summary',
      refundSubtotal: 'Subtotal',
      refundShippingAmount: 'Shipping',
      refundTotal: 'Refund total',
      refundMethod: 'Refund method',
      refundMethodOriginal: 'Original payment',
      refundMethodCredit: 'Store credit',
      refundMethodMixed: 'Original payment and store credit',
      refundAmount: 'Refund amount',
      refundManual: 'Manual',
      refundAvailable: '{amount} available for refund',
      refundExceedsAvailable: 'Amount exceeds available for refund',
      refundButton: 'Refund {amount}',
      refundCreating: 'Creating refund...',
      refundSuccess: 'Refund created successfully',
      refundError: 'Error creating refund',
      refundNoItems: 'No items pending refund',
      refundNoOrder: 'No order linked or multiple orders (select one first)',
      refundNoLocation: 'No default location for restock. Configure it first.',
      refundShippingExceeded: 'Cannot refund more than {max} in shipping',
      
      // Store Credit Warning
      storeCreditWarningTitle: 'Store Credit Refunds',
      storeCreditWarningText: 'Store credit refunds must be processed directly from Shopify.',
      openOrderInShopify: 'Open order in Shopify',
      
      // Discount Modal
      createDiscount: 'Create discount code',
      discountData: 'Discount data',
      discountCode: 'Discount code',
      discountCodePlaceholder: 'E.g. THANKS10',
      discountCodeHelp: 'Single-use code for this customer.',
      discountType: 'Discount type',
      discountTypePercent: 'Percentage',
      discountTypeAmount: 'Fixed amount',
      discountValue: 'Value',
      discountValueHelp: 'For percentage, use values between 0 and 100.',
      discountValueHelpAmount: 'Fixed amount in store currency.',
      discountSummaryTitle: 'Summary',
      discountCustomer: 'Customer',
      discountSummaryMain: 'Define code and discount amount',
      discountSummaryPercent: '{value}% discount',
      discountSummaryAmount: '{value} {currency} discount',
      discountSummaryDetails: '1 use · no minimum purchase · no combinations · active upon creation.',
      createDiscountButton: 'Create code',
      discountCreating: 'Creating…',
      openAdvancedDiscounts: 'Open advanced discounts in Shopify',
      discountCodeEmpty: 'Discount code cannot be empty.',
      discountValueInvalid: 'Enter a discount value greater than 0.',
      discountPercentTooHigh: 'Percentage cannot be greater than 100.',
      discountSuccess: 'Discount code created successfully.',
      discountCopied: 'Code copied to clipboard',
      discountError: 'Error creating discount.',
      
      // Send/Delete notifications
      sendError: 'Error sending email ❌',
      sendBodyTooLong: 'Email body exceeds {limit} characters.',
      sendAttachmentsTooLarge: 'Attachments exceed limit (~24 MB). Total size: {size}.',
      deleteError: 'Error deleting email',
      
      // Order association
      associating: 'Associating...',
      orderAssociatedSuccess: 'Order associated successfully',
      orderAssociationError: 'Error associating order: {error}',
      conversationIdNotFound: 'ConversationId not found',
      
      // Refund preview/calculation errors
      shopifyIdNotFound: 'Could not find Shopify order ID',
      refundPreviewError: 'Error calculating preview',
      refundCalculationError: 'Error calculating refund',
      refundTransactionNotFound: 'Could not determine base transaction for manual refund',
    },
    
    // Feedback page
    feedback: {
      pageTitle: 'Feedback - Email Manager',
      title: 'Share Your Feedback',
      subtitle: 'Your feedback helps us improve. Tell us what you need or what we could do better.',
      
      // Message section
      messageLabel: 'Your message',
      messagePlaceholder: 'Describe your suggestion, problem, or idea in as much detail as possible...',
      
      // Type
      typeLabel: 'Feedback type',
      typeSelectPlaceholder: 'Select an option',
      typeBug: '🐛 Bug / Error',
      typeFeature: '✨ New feature',
      typeImprovement: '🚀 Existing improvement',
      typeUI: '🎨 Interface / Design',
      typePerformance: '⚡ Performance',
      typeOther: '💬 Other',
      
      // Priority
      priorityLabel: 'Priority',
      prioritySelectPlaceholder: 'How urgent is it?',
      priorityLow: '🟢 Low - Whenever possible',
      priorityMedium: '🟡 Medium - Would be useful soon',
      priorityHigh: '🟠 High - I need it soon',
      priorityCritical: '🔴 Critical - Blocking my work',
      
      // Area
      areaLabel: 'Affected area',
      areaSelectPlaceholder: 'Where does it happen?',
      areaInbox: '📬 Inbox',
      areaEmail: '📧 Reading emails',
      areaCompose: '✍️ Compose emails',
      areaShopify: '🛍️ Shopify integration',
      areaProfile: '👤 Profile',
      areaIntegrations: '🔌 Integrations',
      areaGeneral: '🌐 General',
      
      // Contact
      emailLabel: 'Your email (optional)',
      emailPlaceholder: 'To receive updates...',
      emailHint: 'If you want us to notify you when we implement your suggestion',
      
      // Attachment
      attachmentLabel: 'Attach screenshot (optional)',
      attachmentPlaceholder: 'Coming soon',
      
      // Submit
      submitButton: 'Send Feedback',
      submitNote: 'We will respond as soon as possible. Thank you for helping us improve!',
      
      // Success
      successTitle: 'Thank you for your feedback!',
      successMessage: 'We have received your message. We will review it and respond soon.',
      sendAnother: 'Send another feedback',
      successNotification: 'Feedback sent successfully!',
      
      // Errors
      errorMessageRequired: 'Please write your message',
      errorMessageTooShort: 'Message must be at least 10 characters',
      errorTypeRequired: 'Please select the feedback type',
      errorPriorityRequired: 'Please indicate the priority',
      errorSubmitting: 'Error sending feedback. Please try again.',
    },
    
    // Compose/Redactar page
    compose: {
      title: 'Compose email',
      to: 'To',
      cc: 'CC',
      bcc: 'BCC',
      subject: 'Subject',
      message: 'Message',
      send: 'Send',
      saveDraft: 'Save draft',
      discard: 'Discard',
      attachFiles: 'Attach files',
      attachments: 'Attachments',
      removeAttachment: 'Remove attachment',
      sendingEmail: 'Sending email...',
      emailSent: 'Email sent successfully',
      emailError: 'Error sending email',
      draftSaved: 'Draft saved',
      toPlaceholder: 'recipient@email.com',
      subjectPlaceholder: 'Email subject',
      messagePlaceholder: 'Write your message here...',
    },
    
    // Sidebar
    sidebar: {
      inbox: 'Inbox',
      inboxHeader: 'Inbox',
      sent: 'Sent',
      drafts: 'Drafts',
      archived: 'Archived',
      deleted: 'Deleted',
      compose: 'Compose',
      profile: 'Profile',
      info: 'Info',
      integrations: 'Integrations',
      settings: 'Settings',
      settingsHeader: 'Settings',
      help: 'Help',
      plans: 'Plans',
      feedback: 'Feedback',
    },
    
    // Info page
    info: {
      pageTitle: 'Store Information',
      pageSubtitle: 'Complete these blocks. You can mark fields as Not applicable (N/A). We will save the ready-to-use text and also the configuration so you can edit it later.',
      
      // Card titles
      returnsPolicy: 'Returns Policy',
      shippingPolicy: 'Shipping Policy',
      generalInfo: 'General Store Information',
      faq: 'Frequently Asked Questions',
      
      // Common elements
      important: 'Important:',
      formDescription: 'this form collects the <em>minimum information</em> for the bot to work properly. If your policy already includes this data, you can mark the fields as <em>"Not applicable (N/A)"</em>. If any of this data is missing from your policy, complete it here.',
      pastePolicyInstructions: 'You must paste your complete policy at the end of the form, so the bot can use it.',
      notApplicable: '(N/A)',
      fieldsMarkedNA: 'Fields marked as "Not applicable"',
      save: 'Save',
      characters: 'characters',
      
      // Returns policy fields
      returnsDays: '🗓️ Customers have',
      days: 'days',
      naturalDays: 'calendar',
      businessDays: 'business',
      toReturnProduct: 'to return a product',
      productState: '📦 Condition the item must be in to be accepted as a return',
      unused: 'Unused',
      withTag: 'With tag',
      originalPackaging: 'Original packaging',
      sealed: 'Sealed',
      other: 'Other +',
      specifyOther: 'Specify \'Other\'…',
      returnCost: '💸 Return cost',
      customerPays: 'Customer pays',
      storePays: 'Free (store pays)',
      refundMethod: '↩️ Refund method',
      samePaymentMethod: 'Same payment method',
      storeCredit: 'Store credit',
      exchangeProduct: 'Exchange for another product',
      refundTimeframe: '⏱️ Refund timeframe',
      refundTimeText: 'We refund the money in approximately',
      orderCancellation: '🛑 When an order can be canceled',
      notLeftWarehouse: 'If it hasn\'t left the warehouse',
      withinHours: 'Within the first 24 hours',
      returnsPolicyLink: '🔗 Link to returns policy',
      returnsPolicyLinkPlaceholder: 'https://yourstore.com/returns (optional)',
      yourCompleteReturnsPolicy: 'Your complete returns policy',
      policyNote: 'Paste here <strong>only the text of your policy</strong>. Do not add bot behavior instructions, they will be ignored.',
      pasteReturnsPolicyPlaceholder: 'Paste your complete returns policy here…',
      
      // Shipping policy fields
      rates: '💶 Rates',
      zone: 'Zone',
      price: 'Price',
      time: 'Time',
      notes: 'Notes',
      addRow: '+ Add row',
      shippingZones: '🗺️ Shipping zones',
      national: 'Domestic (Spain)',
      eu: 'EU',
      international: 'International',
      specificCountries: 'Specific country/ies +',
      specifyCountries: 'Specify country/ies…',
      globalEstimatedTime: '⏱️ Global estimated time',
      orderIds: '📬 Order identifiers',
      trackingProvided: 'Is tracking number provided?',
      yes: 'Yes',
      no: 'No',
      whenTrackingSent: '🕒 When is tracking sent?',
      whenTrackingSentPlaceholder: 'E.g. when order ships / 24h later',
      shipmentTracking: '🔎 Shipment tracking',
      emailWithLink: 'Email with link',
      onWebsite: 'On our website',
      carrierLink: 'Carrier link',
      trackingUrlPlaceholder: 'Tracking URL (optional)',
      shippingPolicyLink: '🔗 Link to shipping policy',
      shippingPolicyLinkPlaceholder: 'https://yourstore.com/shipping (optional)',
      yourCompleteShippingPolicy: 'Your complete shipping policy',
      pasteShippingPolicyPlaceholder: 'Paste your complete shipping policy here…',
      
      // General info fields
      generalInfoTip: '🧾 Payment methods, location, warranties…',
      paymentMethods: '💳 Accepted payment methods',
      visa: 'Visa',
      mastercard: 'Mastercard',
      paypal: 'PayPal',
      bizum: 'Bizum',
      bankTransfer: 'Bank Transfer',
      cashOnDelivery: 'Cash on Delivery',
      applePay: 'Apple Pay',
      googlePay: 'Google Pay',
      location: '📍 Location',
      online: 'Online',
      physical: 'Physical',
      storeAddress: 'Store address',
      addressChange: '🚚 Address change after order',
      addressChangeConditions: 'Under what conditions can the customer change the shipping address? And what timeframe do they have for this?',
      addressChangePlaceholder: 'Conditions / timeframe',
      sizeChart: '📏 Size chart',
      sizeChartLocation: 'Where is it located?',
      warranty: '🛡️ Warranty',
      noWarranty: 'No warranty',
      warrantyDays: 'Days',
      warrantyMonths: 'Months',
      warrantyYears: 'Years',
      duration: 'Duration:',
      
      // FAQ fields
      faqTip: 'Here you configure your Frequently Asked Questions. Write the <strong>question literally</strong> and an <strong>exact answer</strong> as you want the customer to see it.',
      notApply: 'Not applicable',
      addQuestion: '+ Add question',
      
      // Sidebar
      sidebarTitle: 'Suggestions for information to add',
      showPanel: 'Show panel',
      loadingMessages: 'Loading messages…',
      noEmailsProcessed: 'No emails processed yet.',
      
      // Loading states
      savingYourInfo: 'saving your information...',
      validatingFields: 'validating fields...',
      updatingDatabase: 'updating database...',
      preparingConfirmation: 'preparing confirmation...',
      weAre: 'We are',
      
      // Success/Error messages
      congratulations: 'Congratulations, your information has been saved! 🎉',
      policyExceedsLimit: 'The pasted policy exceeds the maximum of 6000 characters.',
      addInfoOrPastePolicy: 'Add information in the form or paste your policy.',
      botInstructionDetected: 'A bot instruction was detected in the uploaded information and that section has been ignored.',
      policySavedPartially: 'The policy was saved partially, some rules were skipped.',
      errorSavingPolicy: 'Error saving policy.',
      missingQuestion: 'Question is missing in block #{number}',
      missingAnswer: 'Answer is missing in block #{number}',
      addAtLeastOneQuestion: 'Add at least one question.',
      botInstructionInAnswer: 'A bot instruction was detected in an answer and that section has been ignored.',
      unexpectedResponseSavingFAQ: 'Unexpected response when saving FAQs.',
      errorSavingFAQ: 'Error saving FAQs.',
      ideaDeleted: 'Idea removed from pending',
      couldNotDeleteIdea: 'Could not delete idea',
      faqEntryDiscarded: 'FAQ entry was discarded (invalid/filtered content).',
      invalidPartsIgnored: 'Potentially invalid parts of the answer were ignored.',
      questionCannotBeEmpty: 'Question cannot be empty',
      addAnswer: 'Add an answer',
      questionExceedsLimit: 'Question exceeds the maximum of {limit} characters.',
      answerExceedsLimit: 'Answer exceeds the maximum of {limit} characters.',
      questionSaved: 'Question saved to FAQ',
      
      // Legacy keys for compatibility
      title: 'Information',
      pendingIdeas: 'Pending ideas',
      noPendingIdeas: 'No pending ideas',
      howItWorks: 'How it works',
      support: 'Support',
      documentation: 'Documentation',
      tutorials: 'Tutorials',
      contactUs: 'Contact us',
    },
    
    // Integrations page
    integrations: {
      title: 'Integrations',
      subtitle: 'Connect Respondize with your favorite tools',
      emailCategory: 'Email',
      emailCategoryDesc: 'Connect your email account to manage your emails',
      ecommerceCategory: 'E-Commerce Platforms',
      ecommerceCategoryDesc: 'Integrate your online store to sync orders and customers',
      socialMediaCategory: 'Social Media',
      socialMediaCategoryDesc: 'Connect your social networks to manage messages and comments',
      othersCategory: 'Others',
      othersCategoryDesc: 'More integrations to boost your workflow',
      gmail: 'Gmail',
      gmailDescription: 'Connect your Gmail account to manage your emails',
      outlook: 'Outlook',
      outlookDescription: 'Connect your Outlook account to manage your emails',
      shopify: 'Shopify',
      shopifyDescription: 'Connect your Shopify store to manage orders and customers',
      connected: 'Connected',
      notConnected: 'Not connected',
      connect: 'Connect',
      connectGmail: 'Connect Gmail',
      connectShopify: 'Connect Shopify',
      disconnect: 'Disconnect',
      disconnecting: 'Disconnecting...',
      connecting: 'Connecting...',
      activeIntegration: 'Active Integration',
      comingSoon: 'Coming Soon',
      configure: 'Configure',
      status: 'Status',
      active: 'Active',
      inactive: 'Inactive',
      // Modals
      disconnectGmailTitle: 'Disconnect Gmail',
      disconnectGmailMessage: 'Are you sure you want to disconnect Gmail?',
      disconnectGmailWarning: 'You will stop receiving new emails in Respondize.',
      disconnectShopifyTitle: 'Disconnect Shopify',
      disconnectShopifyMessage: 'Are you sure you want to disconnect your Shopify store?',
      disconnectShopifyWarning: 'Access to orders and customer data will be lost.',
      connectShopifyTitle: 'Connect Shopify store',
      enterShopifyDomain: 'Enter your Shopify store domain:',
      shopifyDomainPlaceholder: 'mystore.myshopify.com',
      shopifyDomainExample: 'Example: mystore.myshopify.com',
      cancel: 'Cancel',
      continue: 'Continue',
      // Error messages
      errorConnectingGmail: 'Error connecting to Gmail. Please try again.',
      errorDisconnectingGmail: 'Error disconnecting Gmail. Please try again.',
      errorConnectingShopify: 'Error connecting to Shopify. Please try again.',
      errorDisconnectingShopify: 'Error disconnecting Shopify. Please try again.',
      gmailDisconnected: 'Gmail disconnected successfully',
      shopifyDisconnected: 'Shopify disconnected successfully',
      shopifyDomainRequired: 'Please enter your Shopify store domain',
      gmailConnectedSuccess: 'Gmail connected successfully! You can now receive emails.',
      shopifyConnectedSuccess: 'Shopify connected successfully! You can now sync orders and customers.',
      // Callback error messages
      errorAccessDenied: 'You canceled the connection with the store.',
      errorInvalidSession: 'Session has expired. Please try again.',
      errorSessionExpired: 'Session has expired. Please try again.',
      errorConnectionFailed: 'An error occurred while connecting. Please try again.',
      errorNoCode: 'No authorization code received. Please try again.',
      errorGeneric: 'An error occurred. Please try again.',
      comingSoonInfo: '{product} will be available soon',
    },
    
    // Shopify pages
    shopify: {
      loadingTitle: 'Connecting your store! ✨',
      loadingMessage: 'We are setting up your Respondize account',
      subscriptionConfirmed: 'All set! Redirecting...',
      subscriptionFailed: 'There was a problem with the subscription',
      subscriptionExpired: 'Confirmation time has expired',
      subscriptionNotFound: 'Subscription request not found',
      subscriptionPending: 'Setting up your account...',
      tokenNotFound: 'Confirmation token not found',
      errorVerifying: 'Error verifying subscription status',
      takingTooLong: 'This is taking a bit longer than usual...',
      redirecting: 'Redirecting...',
      loginWithShopify: 'Log in with Shopify',
      registerWithShopify: 'Sign up with Shopify',
      connectShopify: 'Connect with Shopify',
      shopifyStore: 'Shopify Store',
      shopifyStorePlaceholder: 'your-store.myshopify.com',
      ready: 'Your account is ready! ✨',
      loggingIn: 'Connecting with your Shopify store...',
      sessionExpired: 'Your session has expired. Please access again from Shopify.',
      preparingAccount: 'Setting up your Respondize account...',
      waitingConfirmation: 'Waiting for Shopify confirmation...',
    },
    
    // Error messages
    errors: {
      generic: 'An error occurred',
      networkError: 'Connection error',
      unauthorized: 'Unauthorized',
      forbidden: 'Access denied',
      notFound: 'Not found',
      serverError: 'Server error',
      validationError: 'Validation error',
      requiredField: 'This field is required',
      invalidEmail: 'Invalid email',
      invalidPassword: 'Invalid password',
      passwordMismatch: 'Passwords do not match',
      minLength: 'Minimum length not reached',
      maxLength: 'Maximum length exceeded',
    },
    
    // Success messages
    success: {
      saved: 'Saved successfully',
      updated: 'Updated successfully',
      deleted: 'Deleted successfully',
      created: 'Created successfully',
      sent: 'Sent successfully',
    },
    
    // Notifications
    notifications: {
      newEmail: 'New email received',
      emailSent: 'Email sent',
      draftSaved: 'Draft saved',
      profileUpdated: 'Profile updated',
      planChanged: 'Plan updated',
      integrationConnected: 'Integration connected',
      integrationDisconnected: 'Integration disconnected',
    },
    
    // Onboarding
    onboarding: {
      welcome: 'Welcome to Respondize',
      letsGetStarted: "Let's get started",
      step1: 'Complete your profile',
      step2: 'Connect your store',
      step3: 'Set up responses',
      skip: 'Skip',
      finish: 'Finish',
      // Referral code section
      referralCodeTitle: 'Do you have a referral code?',
      referralCodeSubtitle: 'If someone invited you or you have a partner code, enter it here',
      referralCodePlaceholder: 'Enter your code',
      validateCode: 'Validate',
      applyCode: 'Apply code',
      codeValidating: 'Validating code...',
      codeApplying: 'Applying code...',
      codeInvalid: 'Invalid or inactive code',
      codeValidUser: '+10 conversations for you and +10 for who invited you (when converting to paid)',
      codeValidPartner: '+15 conversations for you (when converting to paid)',
      codeApplied: 'Code applied. Conversations will be automatically added when you upgrade to a paid plan.',
      codeAlreadyApplied: 'You already have a code applied',
      codeCannotChange: 'You cannot change the code once applied',
      rewardPending: 'Reward pending: will activate when upgrading to paid plan',
      conversationsWhenPaid: 'conversations will be automatically added to your extra conversations when you upgrade to a paid plan',
    },
    
    // Badge labels (email classification)
    badges: {
      postventa: 'After-sales',
      envios: 'Shipping',
      producto: 'Product',
      tienda: 'Store',
      shopify: 'Shopify',
      comerciales: 'Commercial',
      otros: 'Other',
    },

    // Referrals section
    referrals: {
      sectionTitle: 'Referral Program',
      sectionDescription: 'Invite others and earn extra conversations for free',
      myCodeTitle: 'My referral code',
      myCodeDescription: 'Share this code with friends and stores',
      copyCode: 'Copy code',
      codeCopied: 'Code copied to clipboard',
      noCodeYet: 'Complete onboarding to get your code',
      statsTitle: 'My statistics',
      totalInvites: 'Total invites',
      invitesPaid: 'Paid invites',
      invitesTrial: 'Trial invites',
      conversationsEarned: 'Conversations earned',
      invitedStores: 'Invited stores',
      storeName: 'Store',
      email: 'Email',
      status: 'Status',
      statusTrial: 'On trial',
      statusPaid: 'Paying',
      rewardPending: 'Reward will be applied when converting to paid',
      noInvitesYet: "You haven't invited anyone yet. Share your code!",
      loadingStats: 'Loading statistics...',
      errorLoadingStats: 'Error loading statistics',
      createdAt: 'Created',
      signedUpAt: 'Signed up',
      conversationsGranted: 'Conversations granted',
    },
  }
};

/**
 * Obtiene el idioma actual del usuario
 */
export function getCurrentLocale() {
  // 1. Intentar leer del perfil del store (SOLO si el usuario está autenticado)
  const token = localStorage.getItem('token');
  if (token) {
    try {
      const storeData = localStorage.getItem('store');
      if (storeData) {
        const store = JSON.parse(storeData);
        // El idioma está en 'language', no en 'preferred_language'
        if (store.language && SUPPORTED_LOCALES.includes(store.language)) {
          return store.language;
        }
      }
    } catch (e) {
      console.warn('[getCurrentLocale] Error reading from store:', e);
    }
  }
  
  // 2. Intentar leer de localStorage (idioma de la landing page)
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && SUPPORTED_LOCALES.includes(stored)) {
    return stored;
  }
  
  // 3. Intentar detectar del navegador
  const browserLang = navigator.language?.split('-')[0];
  if (browserLang && SUPPORTED_LOCALES.includes(browserLang)) {
    return browserLang;
  }
  
  // 4. Retornar idioma por defecto
  return DEFAULT_LOCALE;
}

/**
 * Establece el idioma del usuario
 */
export function setLocale(locale) {
  if (!SUPPORTED_LOCALES.includes(locale)) {
    console.warn(`Locale "${locale}" not supported, falling back to "${DEFAULT_LOCALE}"`);
    locale = DEFAULT_LOCALE;
  }
  
  localStorage.setItem(STORAGE_KEY, locale);
  
  // Actualizar el atributo lang del HTML
  document.documentElement.lang = locale;
  
  // Disparar evento para que otros componentes se enteren
  window.dispatchEvent(new CustomEvent('locale-changed', { 
    detail: { locale } 
  }));
  
  return locale;
}

/**
 * Obtiene una traducción por su clave (dot notation)
 * Ejemplo: t('profile.storeName') → "Nombre de la Tienda" (ES) o "Store Name" (EN)
 */
export function t(key, localeOrParams = null, params = null) {
  let locale = null;
  let replacements = null;
  
  // Si el segundo parámetro es un objeto, asumimos que son parámetros y usamos el locale actual
  if (typeof localeOrParams === 'object' && localeOrParams !== null) {
    replacements = localeOrParams;
    locale = getCurrentLocale();
  } else {
    // Si es un string, es el locale
    locale = localeOrParams || getCurrentLocale();
    replacements = params;
  }
  
  const keys = key.split('.');
  let value = translations[locale];
  
  for (const k of keys) {
    if (value && typeof value === 'object') {
      value = value[k];
    } else {
      break;
    }
  }
  
  // Si no encontramos traducción, devolver la clave
  if (typeof value !== 'string') {
    console.warn(`Translation not found for key: ${key} (locale: ${locale})`);
    return key;
  }
  
  // Reemplazar placeholders si hay parámetros
  if (replacements && typeof replacements === 'object') {
    for (const [placeholder, replacement] of Object.entries(replacements)) {
      value = value.replace(new RegExp(`\\{${placeholder}\\}`, 'g'), replacement);
    }
  }
  
  return value;
}

/**
 * Traduce todos los elementos con atributo data-i18n en el DOM
 * Ejemplo: <h1 data-i18n="landing.heroTitle"></h1>
 */
export function translatePage() {
  const locale = getCurrentLocale();
  
  // Traducir textos
  const elements = document.querySelectorAll('[data-i18n]');
  elements.forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key) {
      el.innerHTML = t(key, locale);
    }
  });
  
  // Traducir placeholders
  const placeholders = document.querySelectorAll('[data-i18n-placeholder]');
  placeholders.forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (key) {
      el.placeholder = t(key, locale);
    }
  });
  
  // Traducir títulos (tooltips)
  const titles = document.querySelectorAll('[data-i18n-title]');
  titles.forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    if (key) {
      el.title = t(key, locale);
    }
  });
  
  // Actualizar el atributo lang del HTML
  document.documentElement.lang = locale;
}

/**
 * Obtiene todas las traducciones de una sección
 */
export function getSection(sectionKey, locale = null) {
  if (!locale) {
    locale = getCurrentLocale();
  }
  
  const keys = sectionKey.split('.');
  let value = translations[locale];
  
  for (const k of keys) {
    if (value && typeof value === 'object') {
      value = value[k];
    } else {
      break;
    }
  }
  
  return value || {};
}

/**
 * Inicializa el sistema i18n en una página
 */
export function initI18n() {
  // Traducir la página actual
  translatePage();
  
  // Escuchar cambios de idioma
  window.addEventListener('locale-changed', () => {
    translatePage();
  });
  
  // Añadir clase al HTML con el idioma actual
  document.documentElement.lang = getCurrentLocale();
}

/**
 * Obtiene los idiomas soportados
 */
export function getSupportedLocales() {
  return [...SUPPORTED_LOCALES];
}

/**
 * Verifica si un idioma está soportado
 */
export function isLocaleSupported(locale) {
  return SUPPORTED_LOCALES.includes(locale);
}
