import React from 'react';
import { useState, useEffect } from 'react';
import { useTranslation } from "react-i18next";
import { QRCodeSVG } from 'qrcode.react';
import { backendUrl } from '../config';

export default function About() {

    const { t } = useTranslation();

    const [infoData, setInfoData] = useState();
    const [remoteControlUrl, setRemoteControlUrl] = useState();

    useEffect(() => {
        fetch(backendUrl + '/info')
            .then((response) => response.json())
            .then((data) => {
                setInfoData(data);
                let url = 'http://' + data['platformData']['Hostname'];
                if (window.location.port) {
                    url += ':' + window.location.port
                }
                setRemoteControlUrl(url);
                //console.log(data);
            })
    }, []);

    let tableRows = [];
    if (infoData != null) {
        for (const [key, value] of Object.entries(infoData['platformData'])) {
            tableRows.push(<tr key={key}>
                <td style={{ textAlign: 'right' }}>{key}:</td>
                <td style={{ textAlign: 'left', padding: '0 1rem' }}>{value}</td>
            </tr>);
        }
    }

    return (
        <React.Fragment>
            {infoData ? (
                <div>
                    <h1>{'Depinus - Opus ' + infoData['version'] + ' - ' + infoData['edition']}</h1>
                    <h2>DE<small>tachable</small> PI<small>a</small>N<small>o</small> U<small>n</small>S<small>ilencer</small></h2>
                    <h3>
                        <a
                            href="https://github.com/NHuffschmid/depinus"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ textDecoration: 'none' }}
                        >
                            (c) Norbert Huffschmid
                        </a>
                    </h3>
                    <h4>
                        <a
                            href="http://piano-midi.de/"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ textDecoration: 'none' }}
                        >
                            🎹 (c) Bernd Krüger 🎹
                        </a>
                    </h4>
                    <table style={{
                        marginLeft: 'auto',
                        marginRight: 'auto',
                        marginBottom: '1rem',
                    }}><tbody>{tableRows}</tbody></table>
                    <QRCodeSVG
                        value={remoteControlUrl}
                        level={"Q"}
                        imageSettings={{
                            src: "favicon.ico",
                            height: 32,
                            width: 32,
                        }}
                    />
                    <h3>{t('Remote control') + ': ' + remoteControlUrl}</h3>
                </div>
            ) : ''}
        </React.Fragment>
    )
}
