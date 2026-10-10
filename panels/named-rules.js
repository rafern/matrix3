import * as sidepanel from '/include/sidepanel.js'

// TODO remove test code and actually implement the ui
document.getElementById('listen-tricheck').addEventListener('change', (e) => {
    console.log('changed to', e.target.value);
})

document.getElementById('cancel-tricheck').addEventListener('input', (e) => {
    e.preventDefault();
})