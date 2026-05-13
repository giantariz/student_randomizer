# 🎲 Student Randomizer

Εφαρμογή τυχαίας επιλογής μαθητή/ριας για χρήση στην τάξη. Διαθέτει δύο λειτουργίες: **Simple Mode** για άμεση χρήση χωρίς ρύθμιση και **Advanced Mode** για πλήρη διαχείριση τάξης με αποθήκευση.

---

## Λειτουργίες

### Simple Mode
- Ορίζεις πόσους/ες μαθητές/ριες έχεις (1–200) και ξεκινάς αμέσως
- Οι μαθητές/ριες εμφανίζονται ως «Μαθητής/ρια 1», «Μαθητής/ρια 2», κ.ο.κ.
- Δεν απαιτείται σύνδεση · δεν αποθηκεύεται τίποτα
- Ιστορικό επιλογών για το τρέχον session

### Advanced Mode
- Καταχώρηση ονομάτων μαθητών/ριών και αποθήκευση πολλαπλών τμημάτων
- Σύνδεση με Google (Firebase Auth) ή χρήση ως επισκέπτης (in-memory)
- Συγχρονισμός δεδομένων στο cloud μέσω Firestore
- Ιστορικό κλήσεων ανά μαθητή/ρια και ανά session
- Δημιουργία τυχαίων ομάδων από παρόντες/παρούσες μαθητές/ριες
- Εξαγωγή / εισαγωγή δεδομένων σε JSON και CSV
- **Fair Mode**: Ζυγισμένη τυχαιότητα — μαθητές/ριες που κλήθηκαν λιγότερο πρόσφατα έχουν μεγαλύτερη πιθανότητα επιλογής
- Μεταφορά δεδομένων από guest session σε λογαριασμό Google

### Κοινά χαρακτηριστικά
- Δύο στυλ κλήρωσης: **Neon Pulse** (κινούμενο κείμενο) και **Kino** (κάρτες)
- **Unique Mode**: κάθε μαθητής/ρια κλήθεται μία φορά πριν επαναληφθεί ο γύρος
- Σήμανση απόντων — αποκλείονται αυτόματα από την κλήρωση
- Αναίρεση (Undo) τελευταίας κλήσης
- Εναλλαγή σκοτεινού / ανοιχτού θέματος

---

## Τεχνολογίες

| Στρώμα | Τεχνολογία |
|--------|------------|
| Frontend | Vanilla HTML / CSS / ES Modules |
| Auth | Firebase Authentication (Google Sign-In) |
| Database | Cloud Firestore |
| Hosting | Static (χωρίς backend) |

---

## Δομή αρχείων

```
student_randomizer/
├── index.html          # Landing page (επιλογή mode)
├── simple.html         # Simple Mode
├── advanced.html       # Advanced Mode
├── css/
│   ├── variables.css   # CSS custom properties (χρώματα, spacing)
│   ├── base.css
│   ├── components.css
│   ├── landing.css
│   ├── layout.css
│   ├── mode.css
│   ├── overlays.css
│   ├── picker.css
│   ├── simple.css
│   └── auth.css
└── js/
    ├── firebase.js       # Firebase init
    ├── auth.js           # Authentication logic
    ├── authScreen.js     # Auth UI
    ├── state.js          # App state + shared utilities (uuid, escHtml, shuffleArr)
    ├── data.js           # localStorage persistence
    ├── syncFirestore.js  # Firestore sync
    ├── picker.js         # Κλήρωση (Neon & Kino overlays)
    ├── animation.js      # Animations
    ├── render.js         # DOM rendering
    ├── students.js       # Student CRUD
    ├── classes.js        # Class management
    ├── groups.js         # Random group generator
    ├── history.js        # Session history
    ├── session.js        # Session management + pick logic
    ├── exportImport.js   # JSON / CSV export-import
    ├── modal.js          # Modal dialogs
    ├── toast.js          # Toast notifications
    ├── theme.js          # Dark/light theme
    ├── mode.js           # Expert mode toggle
    ├── main.js           # Advanced Mode entry point
    ├── simple-main.js    # Simple Mode entry point
    └── landing.js        # Landing page entry point
```

---

## Εκκίνηση

Η εφαρμογή είναι pure-static και τρέχει απευθείας στον browser. Επειδή χρησιμοποιεί ES Modules, χρειάζεται HTTP server (το `file://` πρωτόκολλο δεν αρκεί).

```bash
# Με Python
python3 -m http.server 8080

# Με Node.js (npx)
npx serve .
```

Άνοιξε `http://localhost:8080` στον browser.

---

## Firebase

Το Advanced Mode χρησιμοποιεί Firebase. Για να φτιάξεις το δικό σου project:

1. Δημιούργησε project στο [Firebase Console](https://console.firebase.google.com/).
2. Ενεργοποίησε **Authentication → Google**.
3. Ενεργοποίησε **Firestore Database**.
4. Αντέγραψε τα config keys στο `js/firebase.js`.

### Firestore Security Rules

Πρόσθεσε τους παρακάτω κανόνες στο Firestore για να προστατεύσεις τα δεδομένα κάθε χρήστη:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## Περιορισμοί Guest Mode

Ο guest mode αποθηκεύει δεδομένα **μόνο στη μνήμη** (in-memory). Τα δεδομένα χάνονται μόλις κλείσει ο browser ή ανανεωθεί η σελίδα. Για μόνιμη αποθήκευση απαιτείται σύνδεση με Google.

---

## Γνωστά ζητήματα

- Το CSV export περιλαμβάνει μόνο ονόματα μαθητών/ριών — δεν εξάγει timestamps ανά κλήση.
- Το Fair Mode βασίζεται σε εβδομαδιαίο μετρητή κλήσεων· μετά από 7 ημέρες αδράνειας ο μετρητής μηδενίζεται.
