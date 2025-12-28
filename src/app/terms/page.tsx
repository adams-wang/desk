import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service - Desk",
  description: "Terms of Service and Disclaimers for Desk US Equity Trading",
};

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: December 2024</p>

      <div className="space-y-8 text-sm leading-relaxed">
        {/* Important Disclaimer */}
        <section className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <h2 className="text-lg font-semibold text-amber-700 dark:text-amber-400 mb-3">
            Important Disclaimer
          </h2>
          <p className="text-amber-700 dark:text-amber-400">
            This website and its content are for <strong>informational and educational purposes only</strong>.
            Nothing on this site constitutes investment advice, a recommendation, or solicitation to buy
            or sell any securities. <strong>Past performance does not guarantee future results.</strong>
          </p>
        </section>

        {/* No Investment Advice */}
        <section>
          <h2 className="text-xl font-semibold mb-3">1. No Investment Advice</h2>
          <p className="text-muted-foreground mb-3">
            The information provided on Desk, including but not limited to market data, technical indicators,
            signals, scores, and analysis (collectively, &quot;Content&quot;), is for general informational purposes only.
            The Content does not constitute:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
            <li>Investment advice or recommendations</li>
            <li>An offer or solicitation to buy or sell securities</li>
            <li>A recommendation to pursue any investment strategy</li>
            <li>Tax, legal, or financial planning advice</li>
            <li>An endorsement of any particular security or investment</li>
          </ul>
        </section>

        {/* Not a Registered Investment Adviser */}
        <section>
          <h2 className="text-xl font-semibold mb-3">2. Not a Registered Investment Adviser</h2>
          <p className="text-muted-foreground">
            Teea.ai and its affiliates are not registered as investment advisers with the U.S. Securities
            and Exchange Commission (SEC) or any state securities regulatory authority. We do not provide
            personalized investment advice and are not acting in a fiduciary capacity. You should consult
            with a qualified, licensed financial professional before making any investment decisions.
          </p>
        </section>

        {/* Risk Disclosure */}
        <section>
          <h2 className="text-xl font-semibold mb-3">3. Risk Disclosure</h2>
          <p className="text-muted-foreground mb-3">
            Investing in securities involves substantial risk of loss, including the potential loss of
            your entire investment. You should carefully consider the following:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
            <li>Past performance is not indicative of future results</li>
            <li>Historical data and backtested results do not guarantee future performance</li>
            <li>Market conditions can change rapidly and unexpectedly</li>
            <li>Technical indicators and signals may produce false positives or negatives</li>
            <li>No trading system or methodology guarantees profits</li>
            <li>You may lose more than your initial investment in leveraged products</li>
          </ul>
        </section>

        {/* No Guarantees */}
        <section>
          <h2 className="text-xl font-semibold mb-3">4. No Guarantees</h2>
          <p className="text-muted-foreground">
            We make no representations or warranties regarding the accuracy, completeness, timeliness,
            or reliability of any Content. All information is provided &quot;as is&quot; without warranty of any kind.
            We do not guarantee any specific outcomes or results from using the information provided.
          </p>
        </section>

        {/* Your Responsibility */}
        <section>
          <h2 className="text-xl font-semibold mb-3">5. Your Responsibility</h2>
          <p className="text-muted-foreground mb-3">
            By using this service, you acknowledge and agree that:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
            <li>You are solely responsible for your own investment decisions</li>
            <li>You will conduct your own research and due diligence</li>
            <li>You will consult with licensed professionals as appropriate</li>
            <li>You understand and accept the risks of investing in securities</li>
            <li>You will not hold us liable for any investment losses</li>
          </ul>
        </section>

        {/* Data Sources */}
        <section>
          <h2 className="text-xl font-semibold mb-3">6. Data Sources and Accuracy</h2>
          <p className="text-muted-foreground">
            Market data and information displayed on this site are obtained from sources believed to be
            reliable but are not guaranteed to be accurate or complete. Data may be delayed, and prices
            may not reflect real-time market conditions. Always verify information with official sources
            before making trading decisions.
          </p>
        </section>

        {/* Limitation of Liability */}
        <section>
          <h2 className="text-xl font-semibold mb-3">7. Limitation of Liability</h2>
          <p className="text-muted-foreground">
            To the maximum extent permitted by law, Teea.ai and its affiliates, officers, directors,
            employees, and agents shall not be liable for any direct, indirect, incidental, special,
            consequential, or punitive damages arising out of or related to your use of or inability
            to use this service, including but not limited to trading losses, lost profits, or any
            other damages resulting from investment decisions.
          </p>
        </section>

        {/* Indemnification */}
        <section>
          <h2 className="text-xl font-semibold mb-3">8. Indemnification</h2>
          <p className="text-muted-foreground">
            You agree to indemnify and hold harmless Teea.ai and its affiliates from any claims, damages,
            losses, or expenses arising from your use of the service, your investment decisions, or your
            violation of these terms.
          </p>
        </section>

        {/* Changes to Terms */}
        <section>
          <h2 className="text-xl font-semibold mb-3">9. Changes to Terms</h2>
          <p className="text-muted-foreground">
            We reserve the right to modify these terms at any time. Continued use of the service after
            any changes constitutes acceptance of the new terms.
          </p>
        </section>

        {/* Contact */}
        <section>
          <h2 className="text-xl font-semibold mb-3">10. Contact</h2>
          <p className="text-muted-foreground">
            If you have questions about these terms, please contact us at{" "}
            <a href="mailto:legal@teea.ai" className="text-primary hover:underline">
              legal@teea.ai
            </a>
          </p>
        </section>

        {/* Acknowledgment */}
        <section className="p-4 bg-muted/50 rounded-lg border">
          <h2 className="text-lg font-semibold mb-3">Acknowledgment</h2>
          <p className="text-muted-foreground">
            By using Desk, you acknowledge that you have read, understood, and agree to be bound by
            these Terms of Service. If you do not agree to these terms, you should not use this service.
          </p>
        </section>
      </div>
    </div>
  );
}
