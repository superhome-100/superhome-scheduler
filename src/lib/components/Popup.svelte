<script context='module'>
    export const popup = (msg) => {
        let span = document.getElementById('alertText');
        span.innerHTML = msg;
        let a = document.createElement('a');
        a.href = '#alertMsg';
        a.click();
        a.remove();
    };
</script>

<script>
    import ExclamationCircle from './ExclamationCircle.svelte';

    const closePopup = (e) => {
        let span = document.getElementById('alertText');
        if (span.innerHTML !== '') {
            e.stopPropagation();
            span.innerHTML = '';
            let a = document.createElement('a');
            a.href = '#';
            a.click();
            a.remove();
        }
    }
</script>

<svelte:window on:click|capture={closePopup}/>

<div 
    id='alertMsg' 
    class='absolute z-[9999] w-fit top-1/2 p-2 -translate-y-1/2 left-1/2 -translate-x-1/2 bg-black text-red-500 text-center border border-black rounded-lg ring ring-red-500 invisible opacity-0 transition-opacity duration-500 target:visible target:opacity-100'
>
    <ExclamationCircle/><span id='alertText' class='ms-2'></span>
</div>


