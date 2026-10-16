import Link from "next/link";
import { Brand } from "@/components/storefront";
import { catalog } from "@/lib/catalog";
export const metadata = { title: "Le Club & les commandes — Romantica" };
export const dynamic = "force-dynamic";
export default async function Terms() {
  const { products } = await catalog();
  return (
    <main
      className="content"
      style={{ maxWidth: 850, paddingTop: 45, paddingBottom: 70 }}
    >
      <Brand />
      <p className="eyebrow section-gap">C’EST SIMPLE, ET C’EST CLAIR</p>
      <h1 style={{ fontSize: 48 }}>
        Les bons moments,
        <br />
        <em>en toute clarté.</em>
      </h1>
      <div className="panel">
        <h3>Une demande, puis une acceptation</h3>
        <p>
          L’envoi du panier est une demande de commande. Le restaurant doit
          l’accepter. L’heure de retrait est une préférence, soumise à
          confirmation par l’équipe. Le paiement s’effectue au comptoir. Les
          photos sont des illustrations ; interrogez l’équipe pour les
          allergènes ou les détails à confirmer.
        </p>
        <h3>Un repas éligible payé et retiré, un point</h3>
        <p>
          Le compte doit être vérifié en caisse. Les points sont attribués après
          paiement et retrait confirmés par le personnel, à raison d’un point
          par unité de repas éligible. Les boissons sont exclues par défaut. Les
          points des formules sont désactivés initialement. Aucun point pour les
          articles gratuits, les commandes annulées, impayées ou remboursées.
        </p>
        <h3>Huit points, deux identiques pour le prix d’un</h3>
        <p>
          Choisissez deux unités identiques d’un article éligible. Vous payez le
          prix standard d’une unité et la deuxième est offerte. L’avantage
          représente 50% sur cette paire, et ne réduit pas le reste d’une
          commande. L’application demande de commander la paire seule, sans
          autre offre. Huit points sont réservés à la demande, puis débités une
          seule fois après paiement et retrait.
        </p>
        <p>
          Articles actuellement éligibles :{" "}
          {products
            .filter((p) => p.rewardEligible)
            .map((p) => p.name)
            .join(", ")}
          . Le propriétaire peut revoir l’éligibilité selon les coûts.
        </p>
        <h3>Annulation et remboursement</h3>
        <p>
          Une annulation libère les points réservés. Après un remboursement
          intégral confirmé par le personnel, les points gagnés sont retirés, ou
          les huit points du cadeau sont rendus. Des points gagnés déjà utilisés
          peuvent entraîner un solde négatif, qui empêche de débloquer un
          nouveau cadeau.
        </p>
        <h3>Offres étudiantes et formules</h3>
        <p>
          Les offres proposées restent inactives jusqu’à approbation du
          propriétaire. Le tarif étudiant nécessite une vérification en caisse
          et une date de validité active. Les boissons sont exclues par défaut.
          Aucune combinaison de réduction étudiante, formule et cadeau Club.
        </p>
        <p>
          Les montants sont affichés en dinars tunisiens, à trois décimales. Le
          serveur vérifie les prix et la disponibilité lors de l’envoi. Pour
          toute demande ou difficulté, contactez l’équipe du restaurant.
        </p>
      </div>
      <Link className="button secondary" href="/">
        Retour à la carte
      </Link>
    </main>
  );
}
