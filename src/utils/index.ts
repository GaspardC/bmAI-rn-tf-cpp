
import { Platform } from 'react-native'


import * as Sentry from '@sentry/react-native';

export const initSentry = () => {
    // Sentry.init({
    //     dsn: 'https://4fc378731d85424da963eb21946f4f14@o332854.ingest.sentry.io/5338045',
    // });
}


export const isIos = () => Platform.OS === 'ios'

//@ts-ignore
export const isDev = () => __DEV__