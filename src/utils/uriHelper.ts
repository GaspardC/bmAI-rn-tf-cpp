import RNFS from 'react-native-fs'
import { Asset } from 'expo-asset';
import AssetUtils from 'expo-asset-utils';

function getFilename(source_uri) {
    try {
        let filePortion = ''
        if (source_uri.lastIndexOf('?') != -1) {
            filePortion = source_uri.substring(source_uri.lastIndexOf('/'), source_uri.lastIndexOf('?'))
        }
        else {
            filePortion = source_uri.substring(source_uri.lastIndexOf('/'))
        }
        if (RNFS) {
            return RNFS.DocumentDirectoryPath + filePortion
        }
        else {
            console.error('RNFS is null filePortion is: ' + filePortion)
            return ''
        }

    } catch (e) {
        console.log(e)
    }

}

export const loadRemotely = (uri): Promise<typeof Asset> => {
    return AssetUtils.resolveAsync(uri)

}

export const getFilePath = async image => {
    const asset = Asset.fromModule(image)
    if (!asset.localUri) {
        await asset.downloadAsync();
    }
    const uri = asset.localUri;
    return uri
}

export const getFileUri = async (path): Promise<string> => {
    const asset = Asset.fromURI(path)
    if (!asset.localUri) {
        await asset.downloadAsync();
    }
    const localUri = asset.localUri;
    return localUri
}

export async function downloadAssetSource(uri) {
    return new Promise((resolve, reject) => {
        const filename = getFilename(uri)
        RNFS.exists(filename)
            .then((itExists) => {
                if (itExists) {
                    RNFS.unlink(filename)
                        .then(() => { })
                        .catch((err) => {
                            console.error(err)
                            reject('Unable to unlink file at: ' + filename)
                        })
                }
                const ret = RNFS.downloadFile({
                    fromUrl: uri,
                    toFile: filename
                })


                ret.promise.then((res) => {
                    console.log('statusCode is: ' + res.statusCode)
                    if (res.statusCode === 200) {
                        resolve(filename)
                    }
                    else {
                        reject('File at ' + filename + ' not downloaded.  Status code: ' + res.statusCode)
                    }
                })
                    .catch((err) => {
                        console.error(err)
                        reject('File at ' + filename + ' not downloaded')
                    })

            })
            .catch((err) => {
                console.error(err)
                reject('File at ' + filename + ' not downloaded')
            })
    })
}