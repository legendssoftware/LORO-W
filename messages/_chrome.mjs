/** Temporary builder. Merges page, table, tour, and form copy into locale catalogs. */
import { readFileSync, writeFileSync } from 'node:fs';

function L(en, pt, fr, es) {
  return { en, pt, fr, es };
}

const tree = {
  screens: {
    pages: {
      denied: L('You do not have access to this page.', 'Não tem acesso a esta página.', 'Vous n’avez pas accès à cette page.', 'No tiene acceso a esta página.'),
      products: {
        title: L('Products', 'Produtos', 'Produits', 'Productos'),
        description: L('LORO catalogue products and ERP items used in the store.', 'Produtos do catálogo LORO e artigos ERP usados na loja.', 'Produits du catalogue LORO et articles ERP utilisés dans la boutique.', 'Productos del catálogo LORO y artículos ERP usados en la tienda.'),
      },
      warnings: {
        title: L('Warnings', 'Advertências', 'Avertissements', 'Advertencias'),
        description: L('Organisation warnings. A warning created on a staff profile appears here.', 'Advertências da organização. Uma advertência criada no perfil de um colaborador aparece aqui.', 'Avertissements de l’organisation. Un avertissement créé sur un profil apparaît ici.', 'Advertencias de la organización. Una advertencia creada en un perfil aparece aquí.'),
      },
      documents: {
        title: L('Documents', 'Documentos', 'Documents', 'Documentos'),
        description: L('Files saved in the library and in the organisation bucket.', 'Ficheiros guardados na biblioteca e no arquivo da organização.', 'Fichiers enregistrés dans la bibliothèque et dans l’espace de l’organisation.', 'Archivos guardados en la biblioteca y en el archivo de la organización.'),
      },
      feedback: {
        title: L('Feedback', 'Feedback', 'Retours', 'Comentarios'),
        description: L('Inbox, counts, and status updates. Token expiry stays on Settings.', 'Caixa de entrada, totais e atualizações de estado. A validade do token fica em Definições.', 'Boîte de réception, totaux et mises à jour de statut. L’expiration du jeton reste dans Réglages.', 'Bandeja, totales y cambios de estado. La caducidad del token sigue en Ajustes.'),
      },
      geofences: {
        title: L('Geofences', 'Geocercas', 'Géorepérages', 'Geocercas'),
        description: L('Create areas and review entry events. The same areas draw on Competitor Overview.', 'Crie áreas e reveja eventos de entrada. As mesmas áreas aparecem na Vista de concorrentes.', 'Créez des zones et consultez les entrées. Les mêmes zones s’affichent dans la vue Concurrents.', 'Cree zonas y revise las entradas. Las mismas zonas se dibujan en la vista de competidores.'),
      },
      usage: {
        title: L('Usage', 'Utilização', 'Utilisation', 'Uso'),
        description: L('Requests per endpoint. The server records events itself.', 'Pedidos por endpoint. O servidor regista os eventos.', 'Requêtes par endpoint. Le serveur enregistre les événements.', 'Solicitudes por endpoint. El servidor registra los eventos.'),
      },
      news: {
        title: L('News', 'Notícias', 'Actualités', 'Noticias'),
        description: L('Organisation announcements.', 'Anúncios da organização.', 'Annonces de l’organisation.', 'Anuncios de la organización.'),
      },
      salesTips: {
        title: L('Sales tips', 'Dicas de vendas', 'Conseils de vente', 'Consejos de venta'),
        description: L('Edit the catalogue. Home still shows the tip of the day.', 'Edite o catálogo. O início continua a mostrar a dica do dia.', 'Modifiez le catalogue. L’accueil affiche toujours le conseil du jour.', 'Edite el catálogo. Inicio sigue mostrando el consejo del día.'),
      },
      resellers: {
        title: L('Resellers', 'Revendedores', 'Revendeurs', 'Revendedores'),
        description: L('Add, edit, archive, and restore reseller records.', 'Adicione, edite, arquive e restaure fichas de revendedores.', 'Ajoutez, modifiez, archivez et restaurez les fiches revendeurs.', 'Añada, edite, archive y restaure fichas de revendedores.'),
      },
      rewards: {
        title: L('Rewards', 'Recompensas', 'Récompenses', 'Recompensas'),
        description: L("Leaderboard and a person's XP.", 'Classificação e o XP de cada pessoa.', 'Classement et XP de chaque personne.', 'Clasificación y el XP de cada persona.'),
      },
      loyalty: {
        title: L('Loyalty', 'Fidelização', 'Fidélité', 'Fidelización'),
        description: L('Profiles, reward catalogue, and claim history.', 'Perfis, catálogo de recompensas e histórico de resgates.', 'Profils, catalogue de récompenses et historique des réclamations.', 'Perfiles, catálogo de recompensas e historial de canjes.'),
      },
      clients: {
        title: L('Clients', 'Clientes', 'Clients', 'Clientes'),
        description: L('Create, search, and manage organisation clients.', 'Crie, pesquise e gira os clientes da organização.', 'Créez, recherchez et gérez les clients de l’organisation.', 'Cree, busque y gestione los clientes de la organización.'),
      },
      planning: {
        title: L('Planning', 'Planeamento', 'Planification', 'Planificación'),
        description: L('Plan field work, routes, and follow-ups in one place.', 'Planeie trabalho de campo, rotas e seguimentos num só sítio.', 'Planifiez le terrain, les tournées et les relances au même endroit.', 'Planifique el trabajo de campo, las rutas y los seguimientos en un solo lugar.'),
        routeTitle: L('How route planning works', 'Como funciona o planeamento de rotas', 'Comment fonctionne la planification des tournées', 'Cómo funciona la planificación de rutas'),
        routeNote: L(
          'Each night the ERP import matches customers to the rep with the same sales code, then books weekday visits for the next four weeks. Each day stays in one nearby area (about 40 km), up to 10 clients, in driving order. A fuller area continues the next day before a farther area starts. Clients who already have a visit from today through that window stay as they are. Clients without a map address are skipped. All tasks includes those upcoming days. Open Routes and pick the day the visits were planned.',
          'Todas as noites a importação ERP associa clientes ao comercial com o mesmo código de vendas e marca visitas de dias úteis para as quatro semanas seguintes. Cada dia fica numa zona próxima (cerca de 40 km), até 10 clientes, por ordem de condução. Uma zona mais cheia continua no dia seguinte antes de uma zona mais distante. Clientes que já têm visita de hoje até essa janela mantêm-se. Clientes sem morada no mapa são ignorados. Todas as tarefas inclui esses dias. Abra Rotas e escolha o dia em que as visitas foram planeadas.',
          'Chaque nuit, l’import ERP associe les clients au commercial du même code de vente, puis réserve des visites en semaine pour les quatre semaines suivantes. Chaque jour reste dans une zone proche (environ 40 km), jusqu’à 10 clients, dans l’ordre de conduite. Une zone plus pleine continue le lendemain avant une zone plus lointaine. Les clients qui ont déjà une visite d’aujourd’hui jusqu’à cette fenêtre restent tels quels. Les clients sans adresse sur la carte sont ignorés. Toutes les tâches inclut ces jours. Ouvrez Tournées et choisissez le jour planifié.',
          'Cada noche la importación ERP asigna clientes al comercial con el mismo código de ventas y reserva visitas de días laborables para las cuatro semanas siguientes. Cada día queda en una zona cercana (unos 40 km), hasta 10 clientes, en orden de conducción. Una zona más llena continúa al día siguiente antes de una zona más lejana. Los clientes que ya tienen visita desde hoy hasta esa ventana se mantienen. Los clientes sin dirección en el mapa se omiten. Todas las tareas incluye esos días. Abra Rutas y elija el día planificado.',
        ),
        routeEmpty: L(
          'No routes for this day. Pick the day the visits were planned. Each rep needs a branch with coordinates, and that day’s stops are saved as one route.',
          'Não há rotas para este dia. Escolha o dia em que as visitas foram planeadas. Cada comercial precisa de uma filial com coordenadas, e as paragens desse dia ficam numa rota.',
          'Aucune tournée pour ce jour. Choisissez le jour où les visites ont été planifiées. Chaque commercial a besoin d’une agence avec coordonnées, et les arrêts de ce jour forment une tournée.',
          'No hay rutas para este día. Elija el día en que se planificaron las visitas. Cada comercial necesita una sucursal con coordenadas, y las paradas de ese día quedan en una ruta.',
        ),
      },
      pipeline: {
        title: L('Pipeline', 'Pipeline', 'Pipeline', 'Pipeline'),
        subtitleOrg: L('Organisation pipeline for the selected period.', 'Pipeline da organização para o período selecionado.', 'Pipeline de l’organisation pour la période choisie.', 'Pipeline de la organización para el período seleccionado.'),
        subtitleTeam: L('Targets, leads, and visits for your team.', 'Objetivos, leads e visitas da sua equipa.', 'Objectifs, pistes et visites de votre équipe.', 'Objetivos, leads y visitas de su equipo.'),
        subtitleSelf: L('Targets, leads, and visits for your period—scoped to you.', 'Objetivos, leads e visitas do seu período, limitados a si.', 'Objectifs, pistes et visites de votre période, limités à vous.', 'Objetivos, leads y visitas de su período, limitados a usted.'),
        targets: L('Targets & progress', 'Objetivos e progresso', 'Objectifs et progression', 'Objetivos y progreso'),
        quotations: L('Quotations (ERP & LORO)', 'Cotações (ERP e LORO)', 'Devis (ERP et LORO)', 'Cotizaciones (ERP y LORO)'),
        leads: L('Lead pipeline', 'Pipeline de leads', 'Pipeline des pistes', 'Pipeline de leads'),
        visits: L('Visits', 'Visitas', 'Visites', 'Visitas'),
      },
      assets: {
        title: L('Assets', 'Ativos', 'Actifs', 'Activos'),
        descriptionManage: L('Your linked assets, or the full organisation inventory. You can add, edit, and reassign assets.', 'Os seus ativos associados, ou o inventário completo da organização. Pode adicionar, editar e reatribuir ativos.', 'Vos actifs liés, ou l’inventaire complet de l’organisation. Vous pouvez ajouter, modifier et réattribuer des actifs.', 'Sus activos vinculados, o el inventario completo de la organización. Puede añadir, editar y reasignar activos.'),
        descriptionOwn: L('Add and manage assets you own. You can also view equipment and vehicles linked to you.', 'Adicione e gira os ativos que lhe pertencem. Também pode ver equipamento e veículos associados a si.', 'Ajoutez et gérez les actifs qui vous appartiennent. Vous pouvez aussi voir le matériel et les véhicules qui vous sont liés.', 'Añada y gestione los activos que le pertenecen. También puede ver el equipo y los vehículos vinculados a usted.'),
      },
      calls: {
        title: L('Call recordings', 'Gravações de chamadas', 'Enregistrements d’appels', 'Grabaciones de llamadas'),
        description: L('Company-line PBX audio, transcribed into a speaker-labelled dialogue. In-app calls were started from LORO; company phone calls were dialled from Linkus or a desk handset.', 'Áudio do PBX da linha da empresa, transcrito num diálogo com oradores. As chamadas na aplicação começaram no LORO; as chamadas da empresa foram feitas no Linkus ou num telefone de secretária.', 'Audio du PBX de la ligne entreprise, transcrit en dialogue avec locuteurs. Les appels dans l’application partent de LORO ; les appels entreprise partent de Linkus ou d’un poste.', 'Audio del PBX de la línea de la empresa, transcrito en un diálogo con interlocutores. Las llamadas en la aplicación salen de LORO; las llamadas de empresa salen de Linkus o de un teléfono de mesa.'),
        denied: L('You do not have access to call recordings.', 'Não tem acesso às gravações de chamadas.', 'Vous n’avez pas accès aux enregistrements d’appels.', 'No tiene acceso a las grabaciones de llamadas.'),
      },
      merchandise: {
        title: L('Merchandise Management', 'Gestão de merchandising', 'Gestion du merchandising', 'Gestión de merchandising'),
        description: L('Track and manage merchandise inventories and transactions', 'Acompanhe e gira inventários e movimentos de merchandising', 'Suivez et gérez les stocks et les mouvements de merchandising', 'Siga y gestione inventarios y movimientos de merchandising'),
      },
      reports: {
        title: L('Reports', 'Relatórios', 'Rapports', 'Informes'),
        subtitleOrg: L('Org performance targets, policy, call quality, tasks and planning, leads activity, and activity intelligence.', 'Objetivos de desempenho da organização, política, qualidade de chamadas, tarefas e planeamento, atividade de leads e inteligência de atividade.', 'Objectifs de performance de l’organisation, politique, qualité des appels, tâches et planification, activité des pistes et intelligence d’activité.', 'Objetivos de rendimiento de la organización, política, calidad de llamadas, tareas y planificación, actividad de leads e inteligencia de actividad.'),
        subtitleTeam: L('Your team performance targets, policy, call quality, tasks and planning, leads activity, and activity intelligence.', 'Objetivos de desempenho da sua equipa, política, qualidade de chamadas, tarefas e planeamento, atividade de leads e inteligência de atividade.', 'Objectifs de performance de votre équipe, politique, qualité des appels, tâches et planification, activité des pistes et intelligence d’activité.', 'Objetivos de rendimiento de su equipo, política, calidad de llamadas, tareas y planificación, actividad de leads e inteligencia de actividad.'),
        subtitleSelf: L('Your performance targets, policy, tasks and planning, leads activity, and activity intelligence for the selected period.', 'Os seus objetivos de desempenho, política, tarefas e planeamento, atividade de leads e inteligência de atividade no período selecionado.', 'Vos objectifs de performance, la politique, les tâches et la planification, l’activité des pistes et l’intelligence d’activité pour la période choisie.', 'Sus objetivos de rendimiento, política, tareas y planificación, actividad de leads e inteligencia de actividad del período seleccionado.'),
        tabs: {
          targets: L('Targets', 'Objetivos', 'Objectifs', 'Objetivos'),
          policy: L('Policy', 'Política', 'Politique', 'Política'),
          'call-quality': L('Call quality', 'Qualidade de chamadas', 'Qualité des appels', 'Calidad de llamadas'),
          insights: L('Insights', 'Indicadores', 'Analyses', 'Indicadores'),
          tasks: L('Tasks & planning', 'Tarefas e planeamento', 'Tâches et planification', 'Tareas y planificación'),
          'leads-activity': L('Leads activity', 'Atividade de leads', 'Activité des pistes', 'Actividad de leads'),
        },
      },
      performance: {
        title: L('Performance Tracker', 'Acompanhamento de desempenho', 'Suivi de performance', 'Seguimiento de rendimiento'),
        consolidated: L('Consolidated Statement', 'Demonstração consolidada', 'État consolidé', 'Estado consolidado'),
        subtitle: L('Analytics and insights dashboard', 'Painel de análise e indicadores', 'Tableau d’analyse et d’indicateurs', 'Panel de análisis e indicadores'),
        consolidatedSubtitle: L('Sales data across all countries and branches', 'Dados de vendas de todos os países e filiais', 'Données de ventes de tous les pays et agences', 'Datos de ventas de todos los países y sucursales'),
        denied: L('You do not have access to sales performance tracking.', 'Não tem acesso ao acompanhamento de desempenho de vendas.', 'Vous n’avez pas accès au suivi de performance des ventes.', 'No tiene acceso al seguimiento de rendimiento de ventas.'),
        salesByCategory: L('Sales by Category', 'Vendas por categoria', 'Ventes par catégorie', 'Ventas por categoría'),
        salesByCategoryHint: L('Revenue distribution across product categories', 'Distribuição da receita por categorias de produto', 'Répartition du chiffre d’affaires par catégorie de produit', 'Distribución de ingresos por categorías de producto'),
        topBranch: L('Top Branch Performance', 'Desempenho das principais filiais', 'Performance des principales agences', 'Rendimiento de las principales sucursales'),
        topBranchHint: L('Revenue by branch', 'Receita por filial', 'Chiffre d’affaires par agence', 'Ingresos por sucursal'),
        paymentMethods: L('Payment Methods', 'Métodos de pagamento', 'Modes de paiement', 'Métodos de pago'),
        paymentMethodsHint: L('Sales distribution by payment type', 'Distribuição das vendas por tipo de pagamento', 'Répartition des ventes par type de paiement', 'Distribución de ventas por tipo de pago'),
        salesPerProduct: L('Sales Per Product', 'Vendas por produto', 'Ventes par produit', 'Ventas por producto'),
        salesPerProductHint: L('Total amounts sold by product', 'Totais vendidos por produto', 'Montants totaux vendus par produit', 'Importes totales vendidos por producto'),
        salesPerPerson: L('Sales Per Salesperson', 'Vendas por comercial', 'Ventes par commercial', 'Ventas por comercial'),
        salesPerPersonHint: L('Total sales amounts by salesperson', 'Totais de vendas por comercial', 'Montants de ventes par commercial', 'Importes de ventas por comercial'),
        hourly: L('Hourly Sales Pattern', 'Padrão de vendas por hora', 'Profil horaire des ventes', 'Patrón horario de ventas'),
        hourlyHint: L('Sales figures per hour (07:00 - 17:00)', 'Vendas por hora (07:00 - 17:00)', 'Ventes par heure (07:00 - 17:00)', 'Ventas por hora (07:00 - 17:00)'),
        gpTrend: L('Gross Profit Trend', 'Tendência do lucro bruto', 'Tendance de la marge brute', 'Tendencia del beneficio bruto'),
        gpTrendHint: L('Gross profit over time', 'Lucro bruto ao longo do tempo', 'Marge brute dans le temps', 'Beneficio bruto a lo largo del tiempo'),
        dailySales: L('Daily sales performance', 'Desempenho diário de vendas', 'Performance quotidienne des ventes', 'Rendimiento diario de ventas'),
        unassignedInvoices: L('Unassigned invoices', 'Faturas sem atribuição', 'Factures non attribuées', 'Facturas sin asignar'),
        branchCategory: L('Branch × category performance', 'Desempenho filial × categoria', 'Performance agence × catégorie', 'Rendimiento sucursal × categoría'),
      },
      competitors: {
        title: L('Competitors', 'Concorrentes', 'Concurrents', 'Competidores'),
        description: L('Track rivals, threat levels and locations alongside your clients.', 'Acompanhe rivais, níveis de ameaça e localizações junto dos seus clientes.', 'Suivez les rivaux, les niveaux de menace et les lieux à côté de vos clients.', 'Siga rivales, niveles de amenaza y ubicaciones junto a sus clientes.'),
      },
      visualiser: {
        title: L('Competitor Overview', 'Vista de concorrentes', 'Vue concurrents', 'Vista de competidores'),
        descriptionLimited: L('Map branches, HQ, competitors, and clients, plus your planned visit route for the selected day.', 'Mapa de filiais, sede, concorrentes e clientes, mais a rota de visitas planeada para o dia escolhido.', 'Carte des agences, du siège, des concurrents et des clients, plus la tournée prévue pour le jour choisi.', 'Mapa de sucursales, sede, competidores y clientes, más la ruta de visitas prevista para el día elegido.'),
        descriptionFull: L('Map branches, HQ, competitors, and clients — search and track a sales rep’s route on the map, or open Simulate to model catchments and turnover.', 'Mapa de filiais, sede, concorrentes e clientes — pesquise e siga a rota de um comercial, ou abra Simular para modelar áreas de influência e faturação.', 'Carte des agences, du siège, des concurrents et des clients — recherchez et suivez la tournée d’un commercial, ou ouvrez Simuler pour modéliser les zones et le chiffre d’affaires.', 'Mapa de sucursales, sede, competidores y clientes — busque y siga la ruta de un comercial, o abra Simular para modelar áreas y facturación.'),
      },
      wellbeing: {
        title: L('Wellbeing', 'Bem-estar', 'Bien-être', 'Bienestar'),
        description: L('Daily employee pulse, named follow-ups for your team, and mood vs performance estimates.', 'Pulso diário dos colaboradores, seguimentos nominais da equipa e estimativas de humor face ao desempenho.', 'Pouls quotidien des collaborateurs, relances nominatives de l’équipe et estimations humeur / performance.', 'Pulso diario de los empleados, seguimientos con nombre del equipo y estimaciones de ánimo frente al rendimiento.'),
      },
      iot: {
        title: L('IoT devices', 'Dispositivos IoT', 'Appareils IoT', 'Dispositivos IoT'),
        description: L('Manage connected hardware and access devices per branch.', 'Gira hardware ligado e dispositivos de acesso por filial.', 'Gérez le matériel connecté et les accès par agence.', 'Gestione el hardware conectado y los dispositivos de acceso por sucursal.'),
        staffOnly: L('IoT management is available to staff only.', 'A gestão IoT está disponível apenas para colaboradores.', 'La gestion IoT est réservée au personnel.', 'La gestión IoT está disponible solo para el personal.'),
      },
      deliveries: {
        title: L('Deliveries', 'Entregas', 'Livraisons', 'Entregas'),
        description: L('Assign an open ERP sales order to a driver. The signed proof of delivery appears here once the driver records the stop.', 'Atribua uma ordem de venda ERP em aberto a um motorista. A prova de entrega assinada aparece aqui quando o motorista regista a paragem.', 'Attribuez une commande ERP ouverte à un chauffeur. La preuve de livraison signée apparaît ici lorsque le chauffeur enregistre l’arrêt.', 'Asigne un pedido de venta ERP abierto a un conductor. La prueba de entrega firmada aparece aquí cuando el conductor registra la parada.'),
      },
      takeoff: {
        title: L('System takeoff', 'Levantamento de sistema', 'Métré système', 'Medición de sistema'),
        description: L('Measure a ceiling or partition. Quantities are calculated on the server, then issued as a quotation.', 'Meça um teto ou divisória. As quantidades são calculadas no servidor e depois emitidas como cotação.', 'Mesurez un plafond ou une cloison. Les quantités sont calculées sur le serveur, puis émises en devis.', 'Mida un techo o un tabique. Las cantidades se calculan en el servidor y luego se emiten como cotización.'),
      },
      storeOperations: {
        title: L('Store Operations Dashboard – All Stores', 'Painel de operações de loja – todas as lojas', 'Tableau des opérations magasin – tous les magasins', 'Panel de operaciones de tienda – todas las tiendas'),
        description: L('Live branch openings, checklists, and stock counts.', 'Aberturas de filial em direto, listas de verificação e contagens de stock.', 'Ouvertures d’agence en direct, listes de contrôle et comptages de stock.', 'Aperturas de sucursal en directo, listas de verificación y recuentos de stock.'),
        denied: L('You do not have access to the store operations dashboard.', 'Não tem acesso ao painel de operações de loja.', 'Vous n’avez pas accès au tableau des opérations magasin.', 'No tiene acceso al panel de operaciones de tienda.'),
      },
      payslips: {
        title: L('Payslips', 'Recibos de vencimento', 'Bulletins de paie', 'Nóminas'),
        description: L('View and download your payslip documents.', 'Veja e descarregue os seus recibos de vencimento.', 'Consultez et téléchargez vos bulletins de paie.', 'Vea y descargue sus nóminas.'),
      },
      orders: {
        title: L('Orders', 'Encomendas', 'Commandes', 'Pedidos'),
        description: L('Track quotations and orders by status', 'Acompanhe cotações e encomendas por estado', 'Suivez les devis et les commandes par statut', 'Siga cotizaciones y pedidos por estado'),
      },
      store: {
        title: L('Store', 'Loja', 'Boutique', 'Tienda'),
        description: L('Browse products, add to your cart, and submit a quotation.', 'Veja produtos, adicione ao carrinho e submeta uma cotação.', 'Parcourez les produits, ajoutez-les au panier et envoyez un devis.', 'Explore productos, añádalos al carrito y envíe una cotización.'),
        clientOnly: L('Store is available for client portal users.', 'A loja está disponível para utilizadores do portal de cliente.', 'La boutique est disponible pour les utilisateurs du portail client.', 'La tienda está disponible para usuarios del portal de cliente.'),
      },
      intake: {
        unable: L('Unable to open form', 'Não foi possível abrir o formulário', 'Impossible d’ouvrir le formulaire', 'No se pudo abrir el formulario'),
        submitted: L('Profile submitted', 'Perfil submetido', 'Profil envoyé', 'Perfil enviado'),
        submittedBody: L('We saved the profile for {{email}}. A manager will review it on the phone. You will get an email when you can sign in — please wait for that approval.', 'Guardámos o perfil de {{email}}. Um gestor irá revê-lo por telefone. Receberá um email quando puder iniciar sessão — aguarde essa aprovação.', 'Nous avons enregistré le profil de {{email}}. Un responsable le vérifiera par téléphone. Vous recevrez un e-mail lorsque vous pourrez vous connecter — attendez cette validation.', 'Guardamos el perfil de {{email}}. Un responsable lo revisará por teléfono. Recibirá un correo cuando pueda iniciar sesión — espere esa aprobación.'),
        profile: L('Employee profile', 'Perfil do colaborador', 'Profil du collaborateur', 'Perfil del empleado'),
        goSignIn: L('Go to sign in', 'Ir para iniciar sessão', 'Aller à la connexion', 'Ir a iniciar sesión'),
        loading: L('Loading intake form', 'A carregar o formulário de admissão', 'Chargement du formulaire d’entrée', 'Cargando el formulario de alta'),
      },
    },
  },
};

function split(node) {
  const out = { en: {}, pt: {}, fr: {}, es: {} };
  function walk(value, acc) {
    if (value && typeof value === 'object' && 'en' in value && 'pt' in value && 'fr' in value && 'es' in value && Object.keys(value).length === 4) {
      for (const locale of ['en', 'pt', 'fr', 'es']) acc[locale] = value[locale];
      return;
    }
    for (const locale of ['en', 'pt', 'fr', 'es']) acc[locale] = acc[locale] ?? {};
    // wrong - I'm mutating shared. rewrite below
  }
  return walk;
}

const locales = ['en', 'pt', 'fr', 'es'];
function project(node) {
  const result = Object.fromEntries(locales.map((locale) => [locale, null]));
  function walk(value) {
    if (value && typeof value === 'object' && 'en' in value && 'pt' in value && 'fr' in value && 'es' in value && Object.keys(value).every((key) => locales.includes(key))) {
      return Object.fromEntries(locales.map((locale) => [locale, value[locale]]));
    }
    const nested = {};
    for (const [key, child] of Object.entries(value)) {
      const projected = walk(child);
      for (const locale of locales) {
        nested[locale] = nested[locale] ?? {};
        nested[locale][key] = projected[locale];
      }
    }
    return nested;
  }
  const projected = walk(node);
  for (const locale of locales) result[locale] = projected[locale];
  return result;
}

const root = new URL('.', import.meta.url);
function mergeFile(locale, file, extra) {
  const target = new URL(`${locale}/${file}`, root);
  const current = JSON.parse(readFileSync(target, 'utf8'));
  writeFileSync(target, `${JSON.stringify({ ...current, ...extra }, null, 2)}\n`);
}

const screens = project(tree.screens);
for (const locale of locales) mergeFile(locale, 'screens.json', screens[locale]);
console.log('merged pages');
