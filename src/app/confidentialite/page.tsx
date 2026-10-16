import Link from "next/link";
import { Brand } from "@/components/storefront";
export const metadata = { title: "Données & confidentialité — Romantica Club" };
export default function Privacy() {
  return (
    <main
      className="content"
      style={{ maxWidth: 850, paddingTop: 45, paddingBottom: 70 }}
    >
      <Brand />
      <p className="eyebrow section-gap">VOS DONNÉES</p>
      <h1 style={{ fontSize: 48 }}>
        La confiance,
        <br />
        <em>ça se respecte.</em>
      </h1>
      <div className="panel">
        <h3>Pour vos commandes</h3>
        <p>
          Le restaurant utilise votre nom, votre téléphone, les articles
          commandés et l’heure de retrait souhaitée pour traiter votre demande.
          Votre panier est enregistré sur votre appareil pour retrouver votre
          sélection.
        </p>
        <h3>Pour votre compte Club</h3>
        <p>
          Votre nom, votre e-mail, un mot de passe chiffré par hachage, votre
          historique et les mouvements de points sont conservés dans la base de
          données du restaurant. La connexion utilise un cookie de session
          sécurisé, valable sept jours. Le personnel vérifie votre compte en
          personne pour activer les points.
        </p>
        <h3>Pour le tarif étudiant</h3>
        <p>
          Le personnel consulte votre justificatif en personne et enregistre une
          date de validité et un motif de vérification. L’application ne demande
          ni photographie ni copie de votre carte étudiante.
        </p>
        <h3>Pour les campagnes et vos retours</h3>
        <p>
          Un lien de campagne peut associer vos commandes à son code durant
          votre session. Les messages de retour sont privés et visibles par le
          propriétaire. Les communications promotionnelles nécessitent votre
          accord facultatif ; vous pouvez le retirer dans votre compte Club.
          Aucun message promotionnel n’est envoyé automatiquement par cette
          application.
        </p>
        <h3>Accès et demandes</h3>
        <p>
          Les accès du personnel dépendent de son rôle. Pour consulter, corriger
          ou demander la suppression de vos informations, contactez directement
          l’équipe Romantica. Le restaurant doit préciser et communiquer sa
          durée de conservation avant l’ouverture publique du service. Certains
          enregistrements de paiement et d’audit peuvent nécessiter une
          conservation distincte.
        </p>
        <h3>Services externes</h3>
        <p>
          Les liens Google Maps et WhatsApp ouvrent leurs propres services. Ils
          ne créent pas une commande dans l’application. Les QR sont générés
          localement ; les données de votre compte ne sont pas envoyées à un
          générateur de QR tiers.
        </p>
      </div>
      <Link className="button secondary" href="/">
        Retour à Romantica
      </Link>
    </main>
  );
}
