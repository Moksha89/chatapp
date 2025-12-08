export type Language = 'en' | 'es' | 'fr' | 'de' | 'pt' | 'hi';

export const translations: Record<Language, Record<string, string>> = {
  en: {
    // Common
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.search': 'Search',
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.close': 'Close',
    'common.confirm': 'Confirm',
    'common.back': 'Back',
    
    // Auth
    'auth.login': 'Login',
    'auth.logout': 'Logout',
    'auth.scanQr': 'Scan QR Code',
    'auth.scanInstructions': 'Open WhatsApp Business Chat on your phone and scan this QR code',
    
    // Chat
    'chat.newChat': 'New Chat',
    'chat.noMessages': 'No messages yet',
    'chat.startConversation': 'Start the conversation!',
    'chat.typing': 'typing...',
    'chat.selectChat': 'Select a conversation to start messaging',
    'chat.searchMessages': 'Search messages',
    'chat.starredMessages': 'Starred Messages',
    'chat.forwardMessage': 'Forward Message',
    'chat.exportChat': 'Export Chat',
    'chat.disappearingMessages': 'Disappearing Messages',
    'chat.disappearingOff': 'Off',
    'chat.disappearing24h': '24 hours',
    'chat.disappearing7d': '7 days',
    'chat.disappearing90d': '90 days',
    
    // Settings
    'settings.title': 'Settings',
    'settings.privacy': 'Privacy',
    'settings.readReceipts': 'Read Receipts',
    'settings.readReceiptsDesc': 'If turned off, you won\'t send or receive read receipts',
    'settings.language': 'Language',
    'settings.blockedUsers': 'Blocked Users',
    'settings.noBlockedUsers': 'No blocked users',
    
    // User Actions
    'user.block': 'Block User',
    'user.unblock': 'Unblock User',
    'user.report': 'Report User',
    'user.reportReason': 'Reason for report',
    'user.reportDetails': 'Additional details (optional)',
    'user.reportSubmitted': 'Report submitted successfully',
    
    // Messages
    'message.star': 'Star',
    'message.unstar': 'Unstar',
    'message.forward': 'Forward',
    'message.forwarded': 'Forwarded',
    'message.copy': 'Copy',
    'message.delete': 'Delete',
  },
  es: {
    // Common
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
    'common.delete': 'Eliminar',
    'common.edit': 'Editar',
    'common.search': 'Buscar',
    'common.loading': 'Cargando...',
    'common.error': 'Error',
    'common.success': 'Exito',
    'common.close': 'Cerrar',
    'common.confirm': 'Confirmar',
    'common.back': 'Volver',
    
    // Auth
    'auth.login': 'Iniciar sesion',
    'auth.logout': 'Cerrar sesion',
    'auth.scanQr': 'Escanear codigo QR',
    'auth.scanInstructions': 'Abre WhatsApp Business Chat en tu telefono y escanea este codigo QR',
    
    // Chat
    'chat.newChat': 'Nuevo chat',
    'chat.noMessages': 'Sin mensajes aun',
    'chat.startConversation': 'Inicia la conversacion!',
    'chat.typing': 'escribiendo...',
    'chat.selectChat': 'Selecciona una conversacion para empezar a chatear',
    'chat.searchMessages': 'Buscar mensajes',
    'chat.starredMessages': 'Mensajes destacados',
    'chat.forwardMessage': 'Reenviar mensaje',
    'chat.exportChat': 'Exportar chat',
    'chat.disappearingMessages': 'Mensajes temporales',
    'chat.disappearingOff': 'Desactivado',
    'chat.disappearing24h': '24 horas',
    'chat.disappearing7d': '7 dias',
    'chat.disappearing90d': '90 dias',
    
    // Settings
    'settings.title': 'Configuracion',
    'settings.privacy': 'Privacidad',
    'settings.readReceipts': 'Confirmaciones de lectura',
    'settings.readReceiptsDesc': 'Si esta desactivado, no enviaras ni recibiras confirmaciones de lectura',
    'settings.language': 'Idioma',
    'settings.blockedUsers': 'Usuarios bloqueados',
    'settings.noBlockedUsers': 'Sin usuarios bloqueados',
    
    // User Actions
    'user.block': 'Bloquear usuario',
    'user.unblock': 'Desbloquear usuario',
    'user.report': 'Reportar usuario',
    'user.reportReason': 'Motivo del reporte',
    'user.reportDetails': 'Detalles adicionales (opcional)',
    'user.reportSubmitted': 'Reporte enviado exitosamente',
    
    // Messages
    'message.star': 'Destacar',
    'message.unstar': 'Quitar destacado',
    'message.forward': 'Reenviar',
    'message.forwarded': 'Reenviado',
    'message.copy': 'Copiar',
    'message.delete': 'Eliminar',
  },
  fr: {
    // Common
    'common.save': 'Enregistrer',
    'common.cancel': 'Annuler',
    'common.delete': 'Supprimer',
    'common.edit': 'Modifier',
    'common.search': 'Rechercher',
    'common.loading': 'Chargement...',
    'common.error': 'Erreur',
    'common.success': 'Succes',
    'common.close': 'Fermer',
    'common.confirm': 'Confirmer',
    'common.back': 'Retour',
    
    // Auth
    'auth.login': 'Connexion',
    'auth.logout': 'Deconnexion',
    'auth.scanQr': 'Scanner le code QR',
    'auth.scanInstructions': 'Ouvrez WhatsApp Business Chat sur votre telephone et scannez ce code QR',
    
    // Chat
    'chat.newChat': 'Nouvelle discussion',
    'chat.noMessages': 'Pas encore de messages',
    'chat.startConversation': 'Commencez la conversation!',
    'chat.typing': 'ecrit...',
    'chat.selectChat': 'Selectionnez une conversation pour commencer a discuter',
    'chat.searchMessages': 'Rechercher des messages',
    'chat.starredMessages': 'Messages favoris',
    'chat.forwardMessage': 'Transferer le message',
    'chat.exportChat': 'Exporter la discussion',
    'chat.disappearingMessages': 'Messages ephemeres',
    'chat.disappearingOff': 'Desactive',
    'chat.disappearing24h': '24 heures',
    'chat.disappearing7d': '7 jours',
    'chat.disappearing90d': '90 jours',
    
    // Settings
    'settings.title': 'Parametres',
    'settings.privacy': 'Confidentialite',
    'settings.readReceipts': 'Confirmations de lecture',
    'settings.readReceiptsDesc': 'Si desactive, vous n\'enverrez ni ne recevrez de confirmations de lecture',
    'settings.language': 'Langue',
    'settings.blockedUsers': 'Utilisateurs bloques',
    'settings.noBlockedUsers': 'Aucun utilisateur bloque',
    
    // User Actions
    'user.block': 'Bloquer l\'utilisateur',
    'user.unblock': 'Debloquer l\'utilisateur',
    'user.report': 'Signaler l\'utilisateur',
    'user.reportReason': 'Motif du signalement',
    'user.reportDetails': 'Details supplementaires (facultatif)',
    'user.reportSubmitted': 'Signalement envoye avec succes',
    
    // Messages
    'message.star': 'Favoris',
    'message.unstar': 'Retirer des favoris',
    'message.forward': 'Transferer',
    'message.forwarded': 'Transfere',
    'message.copy': 'Copier',
    'message.delete': 'Supprimer',
  },
  de: {
    // Common
    'common.save': 'Speichern',
    'common.cancel': 'Abbrechen',
    'common.delete': 'Loschen',
    'common.edit': 'Bearbeiten',
    'common.search': 'Suchen',
    'common.loading': 'Laden...',
    'common.error': 'Fehler',
    'common.success': 'Erfolg',
    'common.close': 'Schliessen',
    'common.confirm': 'Bestatigen',
    'common.back': 'Zuruck',
    
    // Auth
    'auth.login': 'Anmelden',
    'auth.logout': 'Abmelden',
    'auth.scanQr': 'QR-Code scannen',
    'auth.scanInstructions': 'Offne WhatsApp Business Chat auf deinem Handy und scanne diesen QR-Code',
    
    // Chat
    'chat.newChat': 'Neuer Chat',
    'chat.noMessages': 'Noch keine Nachrichten',
    'chat.startConversation': 'Starte das Gesprach!',
    'chat.typing': 'tippt...',
    'chat.selectChat': 'Wahle eine Unterhaltung aus, um zu chatten',
    'chat.searchMessages': 'Nachrichten suchen',
    'chat.starredMessages': 'Markierte Nachrichten',
    'chat.forwardMessage': 'Nachricht weiterleiten',
    'chat.exportChat': 'Chat exportieren',
    'chat.disappearingMessages': 'Verschwindende Nachrichten',
    'chat.disappearingOff': 'Aus',
    'chat.disappearing24h': '24 Stunden',
    'chat.disappearing7d': '7 Tage',
    'chat.disappearing90d': '90 Tage',
    
    // Settings
    'settings.title': 'Einstellungen',
    'settings.privacy': 'Datenschutz',
    'settings.readReceipts': 'Lesebestatigungen',
    'settings.readReceiptsDesc': 'Wenn deaktiviert, sendest und empfangst du keine Lesebestatigungen',
    'settings.language': 'Sprache',
    'settings.blockedUsers': 'Blockierte Benutzer',
    'settings.noBlockedUsers': 'Keine blockierten Benutzer',
    
    // User Actions
    'user.block': 'Benutzer blockieren',
    'user.unblock': 'Benutzer entsperren',
    'user.report': 'Benutzer melden',
    'user.reportReason': 'Grund der Meldung',
    'user.reportDetails': 'Zusatzliche Details (optional)',
    'user.reportSubmitted': 'Meldung erfolgreich gesendet',
    
    // Messages
    'message.star': 'Markieren',
    'message.unstar': 'Markierung aufheben',
    'message.forward': 'Weiterleiten',
    'message.forwarded': 'Weitergeleitet',
    'message.copy': 'Kopieren',
    'message.delete': 'Loschen',
  },
  pt: {
    // Common
    'common.save': 'Salvar',
    'common.cancel': 'Cancelar',
    'common.delete': 'Excluir',
    'common.edit': 'Editar',
    'common.search': 'Pesquisar',
    'common.loading': 'Carregando...',
    'common.error': 'Erro',
    'common.success': 'Sucesso',
    'common.close': 'Fechar',
    'common.confirm': 'Confirmar',
    'common.back': 'Voltar',
    
    // Auth
    'auth.login': 'Entrar',
    'auth.logout': 'Sair',
    'auth.scanQr': 'Escanear codigo QR',
    'auth.scanInstructions': 'Abra o WhatsApp Business Chat no seu celular e escaneie este codigo QR',
    
    // Chat
    'chat.newChat': 'Nova conversa',
    'chat.noMessages': 'Sem mensagens ainda',
    'chat.startConversation': 'Comece a conversa!',
    'chat.typing': 'digitando...',
    'chat.selectChat': 'Selecione uma conversa para comecar a conversar',
    'chat.searchMessages': 'Pesquisar mensagens',
    'chat.starredMessages': 'Mensagens favoritas',
    'chat.forwardMessage': 'Encaminhar mensagem',
    'chat.exportChat': 'Exportar conversa',
    'chat.disappearingMessages': 'Mensagens temporarias',
    'chat.disappearingOff': 'Desativado',
    'chat.disappearing24h': '24 horas',
    'chat.disappearing7d': '7 dias',
    'chat.disappearing90d': '90 dias',
    
    // Settings
    'settings.title': 'Configuracoes',
    'settings.privacy': 'Privacidade',
    'settings.readReceipts': 'Confirmacoes de leitura',
    'settings.readReceiptsDesc': 'Se desativado, voce nao enviara nem recebera confirmacoes de leitura',
    'settings.language': 'Idioma',
    'settings.blockedUsers': 'Usuarios bloqueados',
    'settings.noBlockedUsers': 'Nenhum usuario bloqueado',
    
    // User Actions
    'user.block': 'Bloquear usuario',
    'user.unblock': 'Desbloquear usuario',
    'user.report': 'Denunciar usuario',
    'user.reportReason': 'Motivo da denuncia',
    'user.reportDetails': 'Detalhes adicionais (opcional)',
    'user.reportSubmitted': 'Denuncia enviada com sucesso',
    
    // Messages
    'message.star': 'Favoritar',
    'message.unstar': 'Remover favorito',
    'message.forward': 'Encaminhar',
    'message.forwarded': 'Encaminhada',
    'message.copy': 'Copiar',
    'message.delete': 'Excluir',
  },
  hi: {
    // Common
    'common.save': 'Save kare',
    'common.cancel': 'Radd kare',
    'common.delete': 'Delete kare',
    'common.edit': 'Edit kare',
    'common.search': 'Khoje',
    'common.loading': 'Load ho raha hai...',
    'common.error': 'Galti',
    'common.success': 'Safalta',
    'common.close': 'Band kare',
    'common.confirm': 'Confirm kare',
    'common.back': 'Wapas',
    
    // Auth
    'auth.login': 'Login kare',
    'auth.logout': 'Logout kare',
    'auth.scanQr': 'QR Code scan kare',
    'auth.scanInstructions': 'Apne phone par WhatsApp Business Chat khole aur is QR code ko scan kare',
    
    // Chat
    'chat.newChat': 'Nayi chat',
    'chat.noMessages': 'Abhi koi message nahi',
    'chat.startConversation': 'Baat shuru kare!',
    'chat.typing': 'likh raha hai...',
    'chat.selectChat': 'Message karne ke liye ek conversation chune',
    'chat.searchMessages': 'Messages khoje',
    'chat.starredMessages': 'Starred Messages',
    'chat.forwardMessage': 'Message forward kare',
    'chat.exportChat': 'Chat export kare',
    'chat.disappearingMessages': 'Gayab hone wale messages',
    'chat.disappearingOff': 'Band',
    'chat.disappearing24h': '24 ghante',
    'chat.disappearing7d': '7 din',
    'chat.disappearing90d': '90 din',
    
    // Settings
    'settings.title': 'Settings',
    'settings.privacy': 'Privacy',
    'settings.readReceipts': 'Read Receipts',
    'settings.readReceiptsDesc': 'Agar band hai, toh aap read receipts nahi bhejenge ya prapt karenge',
    'settings.language': 'Bhasha',
    'settings.blockedUsers': 'Block kiye gaye users',
    'settings.noBlockedUsers': 'Koi blocked user nahi',
    
    // User Actions
    'user.block': 'User ko block kare',
    'user.unblock': 'User ko unblock kare',
    'user.report': 'User ki report kare',
    'user.reportReason': 'Report ka karan',
    'user.reportDetails': 'Aur details (optional)',
    'user.reportSubmitted': 'Report safalta se bhej di gayi',
    
    // Messages
    'message.star': 'Star kare',
    'message.unstar': 'Unstar kare',
    'message.forward': 'Forward kare',
    'message.forwarded': 'Forward kiya gaya',
    'message.copy': 'Copy kare',
    'message.delete': 'Delete kare',
  },
};

export const languageNames: Record<Language, string> = {
  en: 'English',
  es: 'Espanol',
  fr: 'Francais',
  de: 'Deutsch',
  pt: 'Portugues',
  hi: 'Hindi',
};
