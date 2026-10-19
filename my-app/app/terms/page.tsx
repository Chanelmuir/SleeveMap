import type { Metadata } from 'next'
import Link from 'next/link'
import LegalPage, { CONTACT_EMAIL } from '../components/LegalPage'

export const metadata: Metadata = {
  title: 'Terms — SleeveMap',
  description: 'The terms for using SleeveMap.',
}

export default function TermsPage() {
  return (
    <LegalPage title="Terms" updated="20 October 2026">
      <p>
        SleeveMap is a free hobby project run by Chanel Muir. By signing in or using the site you
        agree to these terms.
      </p>

      <h2>Using SleeveMap</h2>
      <ul>
        <li>You need a Strava account to sign in, and you must follow Strava&apos;s own terms.</li>
        <li>Only connect a Strava account that is yours.</li>
        <li>Don&apos;t try to break the site, overload it, or get at other people&apos;s data.</li>
      </ul>

      <h2>Your data</h2>
      <p>
        Your activities stay yours. SleeveMap only uses them to show your map, and to show it to
        others if you make your profile public. The <Link href="/privacy">privacy page</Link>{' '}
        explains what is stored and how to delete it.
      </p>

      <h2>No guarantees</h2>
      <p>
        SleeveMap is provided as it is, for fun. It may have bugs, change, go offline or shut down,
        and Strava sync is currently paused. Don&apos;t rely on it as the only copy of your
        activities. Routes and distances are approximate, so check them yourself before heading
        out, and take care on the roads.
      </p>
      <p>
        As far as the law allows, Chanel isn&apos;t liable for any loss that comes from using
        SleeveMap. Nothing here takes away rights you have under New Zealand consumer law.
      </p>

      <h2>Ending things</h2>
      <p>
        You can delete your account from <Link href="/settings">Settings</Link> whenever you like.
        Accounts that misuse the site may be removed.
      </p>

      <h2>Changes and contact</h2>
      <p>
        These terms may change. The date at the top shows when they last did. Questions go to{' '}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </LegalPage>
  )
}
