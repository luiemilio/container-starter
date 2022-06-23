import { fin } from 'openfin-adapter/src/mock'

const setInstrumentContext = () => {
    const ticker = (document.querySelector('#ticker-input') as HTMLInputElement).value;
    fin.me.interop.setContext({ type: 'instrument', id: { ticker } });
}

const setCountryContext = () => {
    const ISOALPHA3 = (document.querySelector('#country-input') as HTMLInputElement).value;
    fin.me.interop.setContext({ type: 'country', id: { ISOALPHA3 } });
}

const handleInstrumentChange = (contextInfo) => {
    const { id } = contextInfo;
    document.getElementById('ticker').innerText = id.ticker
}
const handleCountryChange = (contextInfo) => {
    const { id } = contextInfo;
    document.getElementById('country').innerText = id.ISOALPHA3
}

const handleInteropChange = (contextInfo) => {
    console.log('###############context incoming##########################', contextInfo)
    const { type  } = contextInfo;

    switch (type) {
        case 'instrument':
            handleInstrumentChange(contextInfo);
            break;

        case 'country':
            handleCountryChange(contextInfo);
            break;

        default:
            break;
    }
}

fin.me.interop.addContextHandler(handleInteropChange);

window.addEventListener('DOMContentLoaded', () => {
    const submitTicker = document.getElementById('ticker-submit');
    submitTicker.onclick = setInstrumentContext;

    const submitCountry = document.getElementById('country-submit');
    submitCountry.onclick = setCountryContext;
});