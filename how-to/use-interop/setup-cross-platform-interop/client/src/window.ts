import { fin } from 'openfin-adapter/src/mock';

export const CONTAINER_ID = 'layout-container';

const ofWin = fin.Window.getCurrentSync();
const ofApp = fin.Application.getCurrentSync();


let lastFocusedView;
const styleObj = document.styleSheets[0];
const buttonsWrapper = document.getElementById('buttons-wrapper');

ofApp.on('view-focused', (viewEvent) => {
    lastFocusedView = viewEvent.viewIdentity;
});

const changeContextGroup = async (evt) => {
    const color = evt.target.title;
    await fin.me.interop.joinContextGroup(color, lastFocusedView);
    document.getElementById(`tab-${lastFocusedView.name}`).classList.remove('red-channel', 'green-channel', 'pink-channel', 'orange-channel', 'purple-channel', 'yellow-channel');
    document.getElementById(`tab-${lastFocusedView.name}`).classList.add(`${color}-channel`);
};

const addContextGroupsBtns = async () => {
    const contextGroups = await fin.me.interop.getContextGroups();

    contextGroups.forEach(systemChannel => {
        styleObj.insertRule(`.${systemChannel.displayMetadata.name}-channel { border-left: 2px solid ${systemChannel.displayMetadata.color} !important;}`);
        styleObj.insertRule(`#${systemChannel.displayMetadata.name}-button:after { background-color: ${systemChannel.displayMetadata.color}}`);
        const newButton = document.createElement('div')
        newButton.classList.add('button');
        newButton.classList.add('channel-button');
        newButton.id = `${systemChannel.displayMetadata.name}-button`;
        newButton.title = systemChannel.displayMetadata.name;
        newButton.onclick = changeContextGroup;
        buttonsWrapper.prepend(newButton);
    });
};

const maxOrRestore = async () => {
    if (await ofWin.getState() === 'normal') {
        return await ofWin.maximize();
    }

    return ofWin.restore();
};

const closeWindow = () => {
    return ofWin.close();
};

const minimizeWindow = () => {
    return ofWin.minimize();
}; 



const setupTitleBarButtons = () => {
    const minBtn = document.getElementById('minimize-button');
    minBtn.onclick = minimizeWindow;

    const maxBtn = document.getElementById('expand-button');
    maxBtn.onclick = maxOrRestore;

    const closeBtn = document.getElementById('close-button');
    closeBtn.onclick = closeWindow;

    addContextGroupsBtns();
};

window.addEventListener('DOMContentLoaded', () => {
    fin.Platform.Layout.init({containerId: CONTAINER_ID});
    setupTitleBarButtons();
});





