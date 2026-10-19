import type { Metadata } from 'next'
import Link from 'next/link'
import LegalPage, { CONTACT_EMAIL } from '../components/LegalPage'

export const metadata: Metadata = {
  title: 'Privacy — SleeveMap',
  description: 'What SleeveMap stores from your Strava account, who can see it, and how to delete it.',
}

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy" updated="20 October 2026">
      <p>
        SleeveMap is a hobby project run by Chanel Muir in New Zealand. It turns your Strava
        activities into one map. This page explains what it stores, who can see it and how to
        get rid of it.
      </p>

      <h2>What SleeveMap stores</h2>
      <p>When you sign in with Strava, SleeveMap asks for permission to read your profile and activities. It stores:</p>
      <ul>
        <li><strong>Your Strava profile:</strong> your athlete ID, name and profile picture.</li>
        <li><strong>A username</strong> used for your map&apos;s address.</li>
        <li><strong>Strava access tokens</strong>, so SleeveMap can fetch your activities. Your Strava password never reaches SleeveMap.</li>
        <li>
          <strong>Your activities that have a GPS route:</strong> the name, type, date, distance,
          moving time, elevation gain and a simplified route line. This includes activities you
          have marked private on Strava.
        </li>
        <li><strong>Your settings</strong>, such as whether your profile is public and your activity colours.</li>
        <li><strong>Athletes you favourite</strong> and <strong>routes you save</strong> in the route planner.</li>
      </ul>
      <p>
        Strava sync is currently paused, so no new activities are being fetched. Activities synced
        before the pause are still stored and shown.
      </p>

      <h2>Who can see it</h2>
      <ul>
        <li>Your profile is <strong>private by default</strong>. Only you can see your map.</li>
        <li>
          If you turn on <strong>Public profile</strong> in Settings, anyone can see your name,
          picture, username and every stored activity on your map, and you appear in Explore.
          Turning it off hides them again.
        </li>
        <li>A saved route can be opened by anyone who has its link.</li>
        <li>Chanel can see the database to run and fix the site. Your data is never sold or shared for advertising.</li>
      </ul>

      <h2>Cookies and analytics</h2>
      <p>
        SleeveMap sets one cookie to keep you signed in, and uses your browser&apos;s local
        storage to remember your theme and whether you have seen notices. It uses Vercel Web
        Analytics to count page views. That does not use cookies or track you across other sites.
      </p>

      <h2>Services SleeveMap relies on</h2>
      <ul>
        <li><strong>Strava</strong>, for sign in and your activity data.</li>
        <li><strong>Supabase</strong>, which hosts the database.</li>
        <li><strong>Vercel</strong>, which hosts the site.</li>
        <li><strong>Mapbox</strong>, which draws the maps. Your browser loads map tiles from Mapbox directly.</li>
      </ul>

      <h2>Deleting your data</h2>
      <p>
        You can delete your account from <Link href="/settings">Settings</Link> at any time. That
        removes your profile, tokens, activities, favourites and saved routes straight away.
        Saved routes nobody has opened in 30 days are also deleted automatically.
      </p>
      <p>
        Disconnecting SleeveMap in your Strava settings stops it reading your account, but does
        not delete what is already stored. Delete your account here as well, or email{' '}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> and it will be done for you.
      </p>

      <h2>Questions</h2>
      <p>
        Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. If this policy changes, the
        date at the top will change too.
      </p>
    </LegalPage>
  )
}
