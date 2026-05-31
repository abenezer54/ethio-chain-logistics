export type Language = "en" | "am";

export const LANGUAGE_STORAGE_KEY = "ec_language";

export const languageNames: Record<Language, string> = {
  en: "English",
  am: "አማርኛ",
};

export const amharicTranslations: Record<string, string> = {
  "Ethio-Chain": "ኢትዮ-ቼይን",
  "Ethio-Chain Logistics": "ኢትዮ-ቼይን ሎጂስቲክስ",
  "Skip to form": "ወደ ቅጹ ዝለል",
  Home: "መነሻ",
  Logistics: "ሎጂስቲክስ",
  "Open portal": "ፖርታሉን ክፈት",
  "Sign in": "ግባ",
  "Choose your role": "ሚናዎን ይምረጡ",
  "Choose your role on Ethio-Chain": "በኢትዮ-ቼይን ላይ ሚናዎን ይምረጡ",
  "Who it is for": "ለማን እንደሆነ",
  Platform: "መድረክ",
  "How it works": "እንዴት እንደሚሰራ",
  Service: "አገልግሎት",
  Register: "ይመዝገቡ",
  Product: "ምርት",
  Company: "ኩባንያ",
  Legal: "ሕጋዊ",
  About: "ስለ እኛ",
  Contact: "ያግኙን",
  Status: "ሁኔታ",
  Privacy: "ግላዊነት",
  Terms: "ውሎች",
  "Register and sign in": "ይመዝገቡ እና ይግቡ",
  "Ethiopia to Djibouti trade corridor": "ከኢትዮጵያ ወደ ጅቡቲ የንግድ መስመር",
  "One place for": "ለሁሉም አንድ ቦታ",
  "imports and exports": "አስመጪና ኤክስፖርት",
  "One place for imports and exports": "ለአስመጪና ኤክስፖርት አንድ ቦታ",
  "Ethio-Chain gives importers and sellers a shared record for the lane. Carriers and offices step in when it is their turn, so you spend less time reconciling chats and PDFs.":
    "ኢትዮ-ቼይን ለአስመጪዎችና ሻጮች በመስመሩ ላይ የተጋራ መዝገብ ይሰጣል። አጓጓዦችና ቢሮዎች ተራቸው ሲደርስ ይገባሉ፣ ስለዚህ ቻቶችንና PDF ፋይሎችን ለማዛመድ የሚያጠፉት ጊዜ ይቀንሳል።",
  "Register for the corridor": "ለመስመሩ ይመዝገቡ",
  "See who it is for": "ለማን እንደሆነ ይመልከቱ",
  "Corridor partners": "የመስመር አጋሮች",
  "Ways to join": "የመቀላቀል መንገዶች",
  "Shared lane": "የተጋራ መስመር",
  "Shipping containers at a logistics hub": "በሎጂስቲክስ ማዕከል ያሉ የመርከብ ኮንቴነሮች",
  "Checked uploads": "የተፈተሹ ሰቀላዎች",
  "Each file gets a fingerprint so changes show up in review":
    "እያንዳንዱ ፋይል የዲጂታል አሻራ ይወስዳል፣ ለውጦችም በግምገማ ይታያሉ",
  "Who Ethio-Chain serves first": "ኢትዮ-ቼይን በመጀመሪያ የሚያገለግላቸው",
  "Built around buyers and sellers on the corridor":
    "በመስመሩ ላይ ባሉ ገዢዎችና ሻጮች ዙሪያ የተገነባ",
  "Start here if you move goods between Ethiopia and Djibouti. Partner roles plug in when the workflow needs them.":
    "እቃዎችን በኢትዮጵያና ጅቡቲ መካከል ካንቀሳቀሱ ከዚህ ይጀምሩ። የአጋር ሚናዎች የሥራ ሂደቱ ሲፈልጋቸው ይቀላቀላሉ።",
  Importers: "አስመጪዎች",
  Sellers: "ሻጮች",
  Partners: "አጋሮች",
  Primary: "ዋና",
  "Also supported": "እንዲሁም የሚደገፉ",
  "Bring purchase orders, licenses, and customs paperwork into one trail. See handoffs without chasing three inboxes.":
    "የግዢ ትዕዛዞችን፣ ፈቃዶችን እና የጉምሩክ ሰነዶችን ወደ አንድ ታሪክ ያስገቡ። ሶስት ኢንቦክሶችን ሳይከታተሉ ርክክቦችን ይመልከቱ።",
  "Keep export permits and buyer-facing docs aligned with the same timeline your freight is on.":
    "የኤክስፖርት ፈቃዶችን እና ለገዢ የሚታዩ ሰነዶችን ጭነትዎ ካለበት ተመሳሳይ የጊዜ መስመር ጋር ያስማሙ።",
  "Carriers, customs, and ESL teams join when it is their step. Same lane, clear roles.":
    "አጓጓዦች፣ ጉምሩክ እና የESL ቡድኖች ደረጃቸው ሲደርስ ይቀላቀላሉ። ተመሳሳይ መስመር፣ ግልጽ ሚናዎች።",
  "Start registration": "ምዝገባ ጀምር",
  "View roles": "ሚናዎችን ይመልከቱ",
  "For buyers and sellers": "ለገዢዎችና ሻጮች",
  "What you get on Ethio-Chain": "በኢትዮ-ቼይን የሚያገኙት",
  "Importers and sellers stay at the center. These three pieces are what teams ask for first when freight is moving fast.":
    "አስመጪዎችና ሻጮች በመሃል ይቆያሉ። ጭነት በፍጥነት ሲንቀሳቀስ ቡድኖች በመጀመሪያ የሚፈልጉት እነዚህ ሶስት ነገሮች ናቸው።",
  "Uploads you can stand behind": "ሊታመኑባቸው የሚችሉ ሰቀላዎች",
  "When you upload licenses or customs papers, we store a fingerprint. If a file changes later, reviewers can spot it.":
    "ፈቃዶችን ወይም የጉምሩክ ሰነዶችን ሲሰቅሉ የዲጂታል አሻራ እናስቀምጣለን። ፋይል በኋላ ከተቀየረ ገምጋሚዎች ሊያዩት ይችላሉ።",
  "Track goods, not phone chains": "እቃዎችን ይከታተሉ፣ የስልክ ሰንሰለቶችን አይደለም",
  "Importers and sellers see where a shipment sits from Addis to Djibouti without calling three desks for the same PDF.":
    "አስመጪዎችና ሻጮች ለአንድ PDF ሶስት ቢሮዎችን ሳይደውሉ ጭነት ከአዲስ አበባ እስከ ጅቡቲ የት እንዳለ ያያሉ።",
  "Clear roles, clear handoffs": "ግልጽ ሚናዎች፣ ግልጽ ርክክቦች",
  "Carriers, customs, and ESL staff step in when it is their turn. Buyers and sellers stay at the center of the flow.":
    "አጓጓዦች፣ ጉምሩክ እና የESL ሰራተኞች ተራቸው ሲደርስ ይገባሉ። ገዢዎችና ሻጮች በሂደቱ መሃል ይቆያሉ።",
  "See the steps": "ደረጃዎቹን ይመልከቱ",
  "From signup to a trail you can show": "ከምዝገባ እስከ ሊያሳዩት የሚችሉት ታሪክ",
  "Plain steps most teams follow in the first month. No buzzwords, just the order of work.":
    "ብዙ ቡድኖች በመጀመሪያ ወር የሚከተሏቸው ቀላል ደረጃዎች። የግብይት ቃላት አይደሉም፣ የሥራ ቅደም ተከተል ብቻ።",
  "Register and upload proof": "ይመዝገቡ እና ማረጋገጫ ይስቀሉ",
  "Importers and sellers pick their role, add business details, and upload the files we need. An admin turns your login on when it looks right.":
    "አስመጪዎችና ሻጮች ሚናቸውን ይምረጣሉ፣ የንግድ ዝርዝሮችን ያክላሉ፣ የምንፈልጋቸውንም ፋይሎች ይሰቅላሉ። ትክክል ሲመስል አስተዳዳሪ መግቢያዎን ያነቃል።",
  "Run shipments in one place": "ጭነቶችን በአንድ ቦታ ያስተዳድሩ",
  "Everyone works off the same timeline so you are not comparing WhatsApp screenshots to a spreadsheet row.":
    "ሁሉም ከተመሳሳይ የጊዜ መስመር ይሰራል፣ ስለዚህ የWhatsApp ስክሪንሾቶችን ከስፕሬድሺት ረድፍ ጋር አያነጻጽሩም።",
  "Show what happened later": "በኋላ የተፈጠረውን ያሳዩ",
  "When someone asks who released a load or cleared a doc, you can point to the history instead of digging through inboxes.":
    "አንድ ሰው ጭነቱን ማን እንደለቀቀ ወይም ሰነዱን ማን እንዳጸደቀ ሲጠይቅ ኢንቦክሶችን ከመፈለግ ይልቅ ወደ ታሪኩ መጠቆም ይችላሉ።",
  "Core roles": "ዋና ሚናዎች",
  "Importers and sellers first": "መጀመሪያ አስመጪዎችና ሻጮች",
  "Portal access": "የፖርታል መዳረሻ",
  "Check status when you need it": "ሲፈልጉ ሁኔታን ይመልከቱ",
  "File trail": "የፋይል ታሪክ",
  "Fingerprint stored per upload": "ለእያንዳንዱ ሰቀላ አሻራ ይቀመጣል",
  Corridor: "መስመር",
  "Ethiopia to Djibouti": "ኢትዮጵያ ወደ ጅቡቲ",
  "Uptime you can plan around": "ሊያቅዱበት የሚችሉ ተገኝነት",
  "The portal stays aligned across offices so buyers and sellers are not arguing over yesterday's spreadsheet row.":
    "ፖርታሉ በቢሮዎች መካከል ተዛማጅ ሆኖ ይቆያል፣ ስለዚህ ገዢዎችና ሻጮች በትናንትናው የስፕሬድሺት ረድፍ ላይ አይከራከሩም።",
  Online: "መስመር ላይ",
  "Fast sync": "ፈጣን ማመሳሰል",
  "Register for access": "ለመዳረሻ ይመዝገቡ",
  "Ready to join the lane?": "መስመሩን ለመቀላቀል ዝግጁ ነዎት?",
  "Start as an importer or seller if that matches your work, or pick a partner role. Upload what we need to verify you, then sign in after an admin activates your account.":
    "ከሥራዎ ጋር ከሚስማማ እንደ አስመጪ ወይም ሻጭ ይጀምሩ፣ ወይም የአጋር ሚና ይምረጡ። ለማረጋገጥ የምንፈልገውን ይስቀሉ፣ ከዚያ አስተዳዳሪ መለያዎን ካነቃ በኋላ ይግቡ።",
  "Choose my role": "ሚናዬን ምረጥ",
  "View platform basics": "የመድረኩን መሠረቶች ይመልከቱ",
  "Less back and forth on documents. Built for teams moving freight between Ethiopia and Djibouti, with importers and sellers up front.":
    "በሰነዶች ላይ የሚኖር ወዲያ ወዲህ መመላለስ ይቀንሳል። በኢትዮጵያና ጅቡቲ መካከል ጭነት ለሚያንቀሳቅሱ ቡድኖች የተገነባ፣ አስመጪዎችና ሻጮች በፊት ላይ።",
  "All rights reserved.": "መብቶች በሙሉ የተጠበቁ ናቸው።",
  "Systems operational": "ስርዓቶች በሥራ ላይ ናቸው",
  "Ethio-Chain Logistics platform": "የኢትዮ-ቼይን ሎጂስቲክስ መድረክ",
  "Sign in to Ethio-Chain": "ወደ ኢትዮ-ቼይን ይግቡ",
  "Sign in to console": "ወደ ኮንሶሉ ይግቡ",
  "Signing in": "በመግባት ላይ",
  "Signing you in…": "እያስገባንዎት ነው…",
  Email: "ኢሜይል",
  Password: "የይለፍ ቃል",
  "Work email": "የሥራ ኢሜይል",
  "Stay signed in on this device": "በዚህ መሣሪያ ላይ ገብቼ እቆይ",
  "Forgot password?": "የይለፍ ቃል ረሱ?",
  "New here?": "አዲስ ነዎት?",
  "Choose a role and register for Ethio-Chain": "ሚና ይምረጡ እና ለኢትዮ-ቼይን ይመዝገቡ",
  "Google or Microsoft sign-in is not available yet. Use your work email and password.":
    "በGoogle ወይም Microsoft መግባት እስካሁን አይገኝም። የሥራ ኢሜይልዎን እና የይለፍ ቃልዎን ይጠቀሙ።",
  "Use the email and password you chose when you registered for the Ethio-Chain logistics platform. Your role is tied to that account.":
    "ለኢትዮ-ቼይን ሎጂስቲክስ መድረክ ሲመዘገቡ የመረጡትን ኢሜይል እና የይለፍ ቃል ይጠቀሙ። ሚናዎ ከዚያ መለያ ጋር ተያይዟል።",
  "Enter a valid email address.": "ትክክለኛ የኢሜይል አድራሻ ያስገቡ።",
  "Email is required.": "ኢሜይል ያስፈልጋል።",
  "Enter your password.": "የይለፍ ቃልዎን ያስገቡ።",
  "Choose a password.": "የይለፍ ቃል ይምረጡ።",
  "Check the email field and try again.": "የኢሜይል መስኩን ያረጋግጡ እና እንደገና ይሞክሩ።",
  "Could not sign you in. Check your email and password and try again.":
    "ማስገባት አልተቻለም። ኢሜይልዎን እና የይለፍ ቃልዎን ያረጋግጡ እና እንደገና ይሞክሩ።",
  "Signed in to Ethio-Chain.": "ወደ ኢትዮ-ቼይን ገብተዋል።",
  "Signed in to Ethio-Chain. Staying logged in on this device.":
    "ወደ ኢትዮ-ቼይን ገብተዋል። በዚህ መሣሪያ ላይ ገብተው ይቆያሉ።",
  Importer: "አስመጪ",
  Seller: "ሻጭ",
  Transporter: "አጓጓዥ",
  Customs: "ጉምሩክ",
  "ESL Agent": "የESL ወኪል",
  "ESL agent": "የESL ወኪል",
  Administrator: "አስተዳዳሪ",
  "Continue as importer": "እንደ አስመጪ ቀጥል",
  "Continue as seller": "እንደ ሻጭ ቀጥል",
  "Register as ESL agent": "እንደ ESL ወኪል ይመዝገቡ",
  "Register as transporter": "እንደ አጓጓዥ ይመዝገቡ",
  "Register as customs user": "እንደ ጉምሩክ ተጠቃሚ ይመዝገቡ",
  "Open admin console": "የአስተዳዳሪ ኮንሶሉን ክፈት",
  "Bring goods through the corridor, track clearance, and keep documents next to each shipment.":
    "እቃዎችን በመስመሩ ያስገቡ፣ የጉምሩክ ማጽደቅን ይከታተሉ፣ ሰነዶችንም ከእያንዳንዱ ጭነት ጋር ያቆዩ።",
  "Move cargo toward buyers, share handoffs, and cut mixed signals on what shipped when.":
    "ጭነትን ወደ ገዢዎች ያንቀሳቅሱ፣ ርክክቦችን ያጋሩ፣ ምን መቼ እንደተላከ የሚፈጠር መዛባትን ይቀንሱ።",
  "Support port and corridor steps for the customers you serve.":
    "ለሚያገለግሏቸው ደንበኞች የወደብ እና የመስመር እርምጃዎችን ይደግፉ።",
  "See assigned loads, routes, and status updates in one thread.":
    "የተመደቡ ጭነቶችን፣ መንገዶችን እና የሁኔታ ዝማኔዎችን በአንድ መስመር ይመልከቱ።",
  "Review declarations and supporting papers for your office.":
    "ለቢሮዎ መግለጫዎችን እና ደጋፊ ሰነዶችን ይመልከቱ።",
  "Approve new accounts and review uploaded ID documents.":
    "አዳዲስ መለያዎችን ያጽድቁ እና የተሰቀሉ የመታወቂያ ሰነዶችን ይገምግሙ።",
  "You are registering for an account on the Ethio-Chain logistics platform. Pick the role that matches how you work. This is not an application to one employer. Each role has its own verification steps. After you choose, you will complete registration for that role.":
    "በኢትዮ-ቼይን ሎጂስቲክስ መድረክ ላይ መለያ ለመፍጠር እየተመዘገቡ ነው። ከሥራዎ ጋር የሚስማማውን ሚና ይምረጡ። ይህ ለአንድ ቀጣሪ የሚቀርብ ማመልከቻ አይደለም። እያንዳንዱ ሚና የራሱ የማረጋገጫ ደረጃዎች አሉት። ከመረጡ በኋላ ለዚያ ሚና ምዝገባዎን ያጠናቅቃሉ።",
  "Last time you chose": "ባለፈው ጊዜ የመረጡት",
  "Loading workspace": "የሥራ ቦታ በመጫን ላይ",
  "Loading your workspace…": "የሥራ ቦታዎ እየተጫነ ነው…",
  Dashboard: "ዳሽቦርድ",
  "Signed in as": "ገብተው ያሉት እንደ",
  Notifications: "ማሳወቂያዎች",
  "No new notifications": "አዲስ ማሳወቂያ የለም",
  Roles: "ሚናዎች",
  "Sign out": "ውጣ",
  "Your importing workspace": "የአስመጪ ሥራ ቦታዎ",
  "Your selling workspace": "የሻጭ ሥራ ቦታዎ",
  "ESL allocation workspace": "የESL ምደባ ሥራ ቦታ",
  "Transporter workspace": "የአጓጓዥ ሥራ ቦታ",
  "Customs clearance workspace": "የጉምሩክ ማጽደቂያ ሥራ ቦታ",
  "Your portal home": "የፖርታል መነሻዎ",
  "This is where your buying workflows will live. You can manage your account today. Full tools for tracking shipments and paperwork are rolling out next.":
    "የግዢ የሥራ ሂደቶችዎ የሚገኙበት ቦታ ይህ ነው። ዛሬ መለያዎን መቆጣጠር ይችላሉ። ጭነቶችን እና ሰነዶችን ለመከታተል ሙሉ መሣሪያዎች ቀጥሎ ይወጣሉ።",
  "This is where your export workflows will live. You can manage your account today. Listing loads and sharing handoffs with buyers is coming soon.":
    "የኤክስፖርት የሥራ ሂደቶችዎ የሚገኙበት ቦታ ይህ ነው። ዛሬ መለያዎን መቆጣጠር ይችላሉ። ጭነቶችን መዘርዘር እና ርክክቦችን ከገዢዎች ጋር ማጋራት በቅርቡ ይመጣል።",
  "Review verified shipments, select available transport capacity, and confirm allocations for departure.":
    "የተረጋገጡ ጭነቶችን ይመልከቱ፣ ያለውን የመጓጓዣ አቅም ይምረጡ፣ ለመነሻም ምደባዎችን ያረጋግጡ።",
  "View allocated sea and inland legs, update route milestones, and attach optional GPS details to the shipment audit trail.":
    "የተመደቡ የባሕር እና የመሬት ክፍሎችን ይመልከቱ፣ የመንገድ ደረጃዎችን ያዘምኑ፣ አማራጭ የGPS ዝርዝሮችንም ወደ ጭነት የኦዲት ታሪክ ያክሉ።",
  "Review arrived shipments, inspect the audit trail and document hashes, then grant final digital release.":
    "የደረሱ ጭነቶችን ይመልከቱ፣ የኦዲት ታሪኩን እና የሰነድ ሃሾችን ይፈትሹ፣ ከዚያም የመጨረሻ ዲጂታል ፍቃድ ይስጡ።",
  "Create shipment": "ጭነት ፍጠር",
  "Refresh": "አድስ",
  "Refresh queue": "ሰልፉን አድስ",
  "Loading…": "በመጫን ላይ…",
  Queue: "ሰልፍ",
  "No documents to preview": "ለቅድመ እይታ ሰነድ የለም",
  "Loading preview…": "ቅድመ እይታ በመጫን ላይ…",
  "Selected file": "የተመረጠ ፋይል",
  Approve: "አጽድቅ",
  "Approve this account?": "ይህን መለያ ይጽድቁ?",
  "Deny this registration?": "ይህን ምዝገባ ይከልክሉ?",
  "Deny registration": "ምዝገባውን ከልክል",
  "Request more information?": "ተጨማሪ መረጃ ይጠየቅ?",
  "Send request": "ጥያቄ ላክ",
  Working: "በሥራ ላይ",
  "Account approved. They can sign in now.": "መለያው ጸድቋል። አሁን መግባት ይችላሉ።",
  "Registration denied.": "ምዝገባው ተከልክሏል።",
  "We asked the user for more information.": "ተጠቃሚውን ተጨማሪ መረጃ እንዲሰጥ ጠይቀናል።",
  "Could not approve this account.": "ይህን መለያ ማጽደቅ አልተቻለም።",
  "Could not deny this account.": "ይህን መለያ መከልከል አልተቻለም።",
  "Could not send the information request.": "የመረጃ ጥያቄውን መላክ አልተቻለም።",
  "No pending registrations": "በመጠባበቅ ላይ ያለ ምዝገባ የለም",
  "Trade license (copy)": "የንግድ ፈቃድ (ቅጂ)",
  "TIN certificate (scan)": "የTIN ሰርቲፊኬት (ስካን)",
  "Business registration": "የንግድ ምዝገባ",
  "Export permit": "የኤክስፖርት ፈቃድ",
  "Operator license": "የኦፕሬተር ፈቃድ",
  "Transport asset registry": "የመጓጓዣ ንብረት መዝገብ",
  "Government ID or badge": "የመንግስት መታወቂያ ወይም ባጅ",
  "Employment verification letter": "የቅጥር ማረጋገጫ ደብዳቤ",
  "Business name": "የንግድ ስም",
  "VAT number": "የVAT ቁጥር",
  "Company address": "የኩባንያ አድራሻ",
  "Origin country": "የመነሻ አገር",
  "Transport asset ID": "የመጓጓዣ ንብረት መታወቂያ",
  "Carrier company": "አጓጓዥ ኩባንያ",
  "Employee ID": "የሰራተኛ መታወቂያ",
  "Branch office": "ቅርንጫፍ ቢሮ",
  Department: "መምሪያ",
  "Staff code": "የሰራተኛ ኮድ",
  "Full name": "ሙሉ ስም",
  Phone: "ስልክ",
  "Register for Ethio-Chain": "ለኢትዮ-ቼይን ይመዝገቡ",

"You are creating one user account on the Ethio-Chain logistics platform (not an application to a single employer). Add your selling business details and upload export documents so Ethio-Chain can verify you as a seller.":
  "በኢትዮ-ቼይን ሎጂስቲክስ መድረክ ላይ አንድ የተጠቃሚ መለያ እየፈጠሩ ነው። ይህ ለአንድ ቀጣሪ የሚቀርብ ማመልከቻ አይደለም። ኢትዮ-ቼይን እንደ ሻጭ ሊያረጋግጥዎ የሽያጭ ንግድ ዝርዝሮችዎን ያስገቡ እና የኤክስፖርት ሰነዶችን ይስቀሉ።",
"Details for your role": "የሚናዎ ዝርዝሮች",
"We use this to verify you in the role you chose. Enter the legal name and numbers that match your organization on official paperwork.":
  "ይህን መረጃ በመረጡት ሚና ለማረጋገጥዎ እንጠቀማለን። በኦፊሴላዊ ሰነዶች ላይ ካለው ድርጅትዎ ጋር የሚዛመደውን ሕጋዊ ስም እና ቁጥሮች ያስገቡ።",
"Upload documents for Ethio-Chain": "ለኢትዮ-ቼይን ሰነዶችን ይስቀሉ",
"These files go to platform administrators who review your role. PDF or clear photos, up to 25 MB each. Good scans speed up review.":
  "እነዚህ ፋይሎች ሚናዎን ወደሚገመግሙ የመድረኩ አስተዳዳሪዎች ይላካሉ። PDF ወይም ግልጽ ፎቶዎች፣ እያንዳንዱ እስከ 25 MB። ጥሩ ስካኖች ግምገማውን ያፋጥናሉ።",
"Submit registration for review": "ምዝገባውን ለግምገማ ያስገቡ",

"Importers and sellers": "አስመጪዎችና ሻጮች",
  "These roles cover most trade on the platform. Pick importer or seller if that is how you use Ethio-Chain.":
    "እነዚህ ሚናዎች በመድረኩ ላይ አብዛኛውን ንግድ ይሸፍናሉ። ኢትዮ-ቼይንን የሚጠቀሙበት መንገድ እንደ አስመጪ ወይም ሻጭ ከሆነ ያንን ይምረጡ።",
  "Partners and service roles": "አጋሮችና የአገልግሎት ሚናዎች",
  "Same platform, different role types. Carriers, customs, ESL staff, and platform admins also register here with their own checks.":
    "ተመሳሳይ መድረክ ነው፣ ግን የተለያዩ የሚና አይነቶች አሉ። አጓጓዦች፣ ጉምሩክ፣ የESL ሰራተኞች እና የመድረኩ አስተዳዳሪዎች እንዲሁም በራሳቸው ማረጋገጫዎች እዚህ ይመዘገባሉ።",
  "Change role": "ሚና ቀይር",
  "Ethio-Chain verification before access":
    "መዳረሻ ከመሰጠቱ በፊት የኢትዮ-ቼይን ማረጋገጫ",

  "Role:": "ሚና፦",
  "You are creating one user account on the Ethio-Chain logistics platform (not an application to a single employer).":
    "በኢትዮ-ቼይን ሎጂስቲክስ መድረክ ላይ አንድ የተጠቃሚ መለያ እየፈጠሩ ነው። ይህ ለአንድ ቀጣሪ የሚቀርብ ማመልከቻ አይደለም።",
  "Add your buying business details and upload trade documents so Ethio-Chain can verify you as an importer.":
    "ኢትዮ-ቼይን እንደ አስመጪ ሊያረጋግጥዎ የግዢ ንግድ ዝርዝሮችዎን ያስገቡ እና የንግድ ሰነዶችን ይስቀሉ።",
  "Add your selling business details and upload export documents so Ethio-Chain can verify you as a seller.":
    "ኢትዮ-ቼይን እንደ ሻጭ ሊያረጋግጥዎ የሽያጭ ንግድ ዝርዝሮችዎን ያስገቡ እና የኤክስፖርት ሰነዶችን ይስቀሉ።",
  "Full name (optional)": "ሙሉ ስም (አማራጭ)",
  "Phone (optional)": "ስልክ (አማራጭ)",
  "At least 8 characters": "ቢያንስ 8 ቁምፊዎች",
};
