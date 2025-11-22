import '../styles/globals.css';
import Head from 'next/head';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        {/* Google Identity Services */}
        <script src="https://accounts.google.com/gsi/client" async defer></script>

        {/* Our authentication configuration */}
        <script src="/js/config.js"></script>

        {/* Our authentication system */}
        <script src="/js/auth.js"></script>
      </Head>

      <Component {...pageProps} />
    </>
  );
}
