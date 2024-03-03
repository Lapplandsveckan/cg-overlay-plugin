import '../../public/style.css';
import type {AppProps} from 'next/app';
import Head from 'next/head';
import React from 'react';

function App({ Component, pageProps }: AppProps) {
    return (
        <>
            <Head>
                <title>Caspar Manager</title>
                <meta name="viewport" content="initial-scale=1.0, width=device-width" />
            </Head>
            <Component {...pageProps} />
        </>
    );
}

export default App;