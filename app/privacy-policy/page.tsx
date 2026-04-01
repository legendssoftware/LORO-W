import Link from 'next/link';
import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';

export const metadata = buildPageMetadata({
  segmentTitle: PAGE_COPY.privacy.title,
  description: PAGE_COPY.privacy.description,
  path: '/privacy-policy',
  indexable: true,
});

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-900 via-zinc-950 to-black text-zinc-100">
      <div className="flex w-full flex-col items-center px-4 py-12 md:py-16">
        <Link
          href="/"
          className="font-body mb-8 text-sm text-zinc-400 underline-offset-4 transition-colors hover:text-white"
        >
          ← Back to home
        </Link>

        <h1 className="font-body text-center text-3xl font-semibold tracking-tight text-white md:text-4xl">
          Privacy Policy
        </h1>
        <p className="font-body mt-2 text-center text-sm text-zinc-400">
          Last updated: March 2026
        </p>

        <div className="mt-10 w-full space-y-10 text-center">
          <section>
            <h2 className="font-body text-xl font-semibold text-white">1. Introduction and scope</h2>
            <p className="font-body mt-3 text-sm leading-relaxed text-zinc-400">
              This Privacy Policy describes how Legend Systems (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) collects, uses, and shares
              information in connection with the LORO mobile application and LORO web platform (together, &quot;LORO&quot; or the
              &quot;App&quot;). LORO is a workforce management, attendance tracking, and field operations platform. By using LORO, you agree to
              the practices described in this policy. The entity named in the Google Play store listing for the LORO app is the same as the
              developer referenced in this policy.
            </p>
          </section>

          <section>
            <h2 className="font-body text-xl font-semibold text-white">2. Data we collect and how we use it</h2>
            <p className="font-body mt-3 text-sm leading-relaxed text-zinc-400">
              We collect and use the following categories of data to provide and improve the App, and to comply with legal obligations.
            </p>

            <h3 className="font-body mt-5 text-base font-medium text-zinc-300">Account and authentication</h3>
            <p className="font-body mt-2 text-sm leading-relaxed text-zinc-400">
              We use Clerk to manage sign-in and account identity. This may include your email address, name, and profile information that
              you or your organisation provide. We use this data to authenticate you, manage your account, and sync your identity across the
              mobile and web apps.
            </p>

            <h3 className="font-body mt-5 text-base font-medium text-zinc-300">Location (mobile app)</h3>
            <p className="font-body mt-2 text-sm leading-relaxed text-zinc-400">
              The LORO mobile app requests access to your device location (including in the background) to track your work location during
              active shifts and for attendance and visit-related features. Location data is collected only when you are clocked in or when
              the app is used for work-related activities. We do not use location for advertising. You can revoke location permission in your
              device settings at any time.
            </p>

            <h3 className="font-body mt-5 text-base font-medium text-zinc-300">Camera and photos (mobile app)</h3>
            <p className="font-body mt-2 text-sm leading-relaxed text-zinc-400">
              The LORO mobile app may use your device camera and photo library to capture or attach images to visits and work activities
              (e.g. proof of visit, documentation). Photos you take or select are uploaded to our systems in connection with those
              features. We do not use camera or photo data for advertising.
            </p>

            <h3 className="font-body mt-5 text-base font-medium text-zinc-300">Biometrics (mobile app)</h3>
            <p className="font-body mt-2 text-sm leading-relaxed text-zinc-400">
              The app may offer optional biometric authentication (e.g. Face ID, fingerprint) to unlock the app quickly and securely.
              Biometric data is processed locally on your device and is not sent to our servers or stored by us.
            </p>

            <h3 className="font-body mt-5 text-base font-medium text-zinc-300">Notifications</h3>
            <p className="font-body mt-2 text-sm leading-relaxed text-zinc-400">
              We may send push notifications (e.g. shift reminders, attendance alerts, updates) if you enable notifications. You can
              disable these in your device or app settings.
            </p>

            <h3 className="font-body mt-5 text-base font-medium text-zinc-300">Analytics and crash reporting</h3>
            <p className="font-body mt-2 text-sm leading-relaxed text-zinc-400">
              We use Sentry for error and crash reporting and to improve app stability. This may include device information, app version,
              and in some cases data that helps us diagnose issues (e.g. IP address or user context). We configure these tools in line with
              our need to fix bugs and improve the service.
            </p>

            <h3 className="font-body mt-5 text-base font-medium text-zinc-300">Usage and web platform</h3>
            <p className="font-body mt-2 text-sm leading-relaxed text-zinc-400">
              When you use the LORO web platform, we receive information necessary to provide the service (e.g. requests to our servers,
              session data). We may use cookies or similar technologies for authentication and security. We do not sell your personal or
              sensitive data.
            </p>
          </section>

          <section>
            <h2 className="font-body text-xl font-semibold text-white">3. How we share data</h2>
            <p className="font-body mt-3 text-sm leading-relaxed text-zinc-400">
              We share data only as needed to operate the App and as described below. We do not sell your personal or sensitive user data.
            </p>
            <ul className="font-body mt-3 list-inside list-disc space-y-1 text-sm text-zinc-400">
              <li>
                <strong className="text-zinc-300">Service providers:</strong> We use Clerk (authentication) and Sentry (crash/error
                reporting). These providers process data on our behalf under contractual obligations to protect your data.
              </li>
              <li>
                <strong className="text-zinc-300">Your organisation:</strong> If you use LORO through an organisation (e.g. employer),
                attendance, location, and visit-related data may be visible to that organisation for workforce and operations management.
              </li>
              <li>
                <strong className="text-zinc-300">Legal and safety:</strong> We may disclose data where required by law or to protect
                rights, safety, or property.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-body text-xl font-semibold text-white">4. Data retention and deletion</h2>
            <p className="font-body mt-3 text-sm leading-relaxed text-zinc-400">
              We retain your data for as long as your account is active or as needed to provide the service, comply with law, or resolve
              disputes. You may request deletion of your account and associated personal data. When you request account deletion, we will
              delete or anonymise your personal data in line with our retention and deletion policy, except where we must retain data for
              legal, security, or fraud-prevention reasons. Temporary deactivation or disabling of an account does not qualify as
              deletion. You can request account deletion from within the App or by contacting us (see Contact below).
            </p>
          </section>

          <section>
            <h2 className="font-body text-xl font-semibold text-white">5. Security</h2>
            <p className="font-body mt-3 text-sm leading-relaxed text-zinc-400">
              We implement appropriate technical and organisational measures to protect your personal and sensitive data against
              unauthorised access, alteration, disclosure, or destruction. This includes secure transmission (e.g. HTTPS), access controls,
              and secure handling of data by our systems and service providers.
            </p>
          </section>

          <section>
            <h2 className="font-body text-xl font-semibold text-white">6. Your rights</h2>
            <p className="font-body mt-3 text-sm leading-relaxed text-zinc-400">
              Depending on your location, you may have the right to access, correct, or delete your personal data, object to or restrict
              processing, or data portability. You can update account details in the App where available. To exercise your rights or submit
              a privacy inquiry, contact us using the details below. You may also have the right to lodge a complaint with a supervisory
              authority.
            </p>
          </section>

          <section>
            <h2 className="font-body text-xl font-semibold text-white">7. Contact</h2>
            <p className="font-body mt-3 text-sm leading-relaxed text-zinc-400">
              This Privacy Policy is issued by Legend Systems for the LORO application. For privacy-related questions, requests (including
              account or data deletion), or to submit inquiries, please contact:
            </p>
            <p className="font-body mt-3 text-sm leading-relaxed text-zinc-400">
              Email:{' '}
              <a
                href="mailto:brandon@legendsystems.co.za"
                className="text-white underline underline-offset-2 transition-colors hover:text-purple-400"
              >
                brandon@legendsystems.co.za
              </a>
            </p>
            <p className="font-body mt-4 text-sm leading-relaxed text-zinc-400">
              We will respond to legitimate requests in accordance with applicable law.
            </p>
          </section>

          <section>
            <p className="font-body text-sm leading-relaxed text-zinc-400">
              We may update this Privacy Policy from time to time. We will post the updated policy on this page and indicate the last
              updated date. Continued use of LORO after changes constitutes acceptance of the revised policy.
            </p>
          </section>
        </div>

        <div className="mt-12 w-full border-t border-white/10 pt-8 text-center">
          <Link
            href="/"
            className="font-body text-sm text-zinc-400 underline-offset-4 transition-colors hover:text-white"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
