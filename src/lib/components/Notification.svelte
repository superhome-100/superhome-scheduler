<script context='module'>
    export const notification = (msg, checkboxMsg) => {
        let span = document.getElementById('notificationText');
        span.innerHTML = msg;
        let label = document.getElementById('notificationLabel');
        label.innerHTML = checkboxMsg;
        let a = document.createElement('a');
        a.href = '#notification';
        a.click();
        a.remove();
    };
</script>

<script>
    import { enhance } from '$app/forms';
    import { user } from '$lib/stores.js';

    export let ntf;

    const closeNotification = () => {
        let span = document.getElementById('notification');
        if (span != null) {
            e.stopPropagation();
            span.innerHTML = '';
            let a = document.createElement('a');
            a.href = '#';
            a.click();
            a.remove();
        }
    }
    const submitReceipt = async ({ form, data, action, cancel }) => {
        closeNotification();
        return async ({ result, update }) => {
            switch(result.type) {
                case 'success':
                    console.log("yay");
                    break;
            }
        }
    }
</script>

{#if $user && ntf}
<div 
    id='notification' 
    class='absolute z-[9999] min-w-[300px] top-1/2 p-2 -translate-y-1/2 left-1/2 -translate-x-1/2 bg-black text-teal-400 border border-black rounded-lg ring ring-teal-400 invisible opacity-0 transition-opacity duration-500 target:visible target:opacity-100'
>
    <span id='notificationText' class='table mx-auto mb-4'></span>
    <form
        method='POST'
        action='/?/submitReceipt'
        use:enhance={submitReceipt}
    >
        <input type='hidden' name='notificationId' value={ntf.id}>
        <input type='hidden' name='userId' value={$user.id}>
        <div class='flex justify-between'>
            <div>
                <input type='checkbox' id='notificationAccept' name='accept'>
                <label id='notificationLabel' for='notificationAccept'></label>
            </div>
            <button 
                type="submit" 
                class='bg-gray-100 disabled:text-gray-400 px-3 py-1'
            >OK</button>
        </div>
    </form>
</div>
{/if}

