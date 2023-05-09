<script>
    import { enhance } from '$app/forms';
    import { user, users, reservations } from '$lib/stores.js';
    import { toast, Toaster } from 'svelte-french-toast'
    import { getContext } from 'svelte';

    let { close } = getContext('simple-modal');

    $: userNicknames = Object.values($users).map(user => user.nickname);

    function removeFocus(e) {
        if (e.keyCode == 13) {
            this.blur();
        }
    }

    const updateNickname = async ({ form, data, action, cancel }) => {
        if (data.get('nickname').length == 0) {
            cancel();
            close();
            return;
        }
        if (data.get('nickname') === $user.nickname) {
            cancel();
            close();
            return;
        }
        if (userNicknames.includes(data.get('nickname'))) {
            alert('That name is already taken.  Please choose a different name.');
            cancel();
            return;
        }

        close();
        return async ({ result, update }) => {
            switch (result.type) {
                case 'success':
                    $user.nickname = result.data.nickname;
                    $reservations
                        .filter(rsv => rsv.user.id === $user.id)
                        .map(rsv => rsv.user.nickname = $user.nickname);
                    $reservations = [...$reservations];
                    toast.success('Display name updated');
                    break;
                default:
                    console.error(result);
                    toast.error('Could not update display name!');
                    break;
            }
        }
    };

</script>

<div class='text-center dark:text-white mb-2'>
    Set your display name
</div>
<form
    method='POST'
    action='/?/nickname'
    use:enhance={updateNickname}
    class='text-center mb-2'
>
    <input type='hidden' name='id' value={$user.id}>
    <input
        type='text'
        class='text-center w-44 text-xs'
        name='nickname'
        placeholder={$user.nickname}
        on:keypress={removeFocus}
    >
</form>

<Toaster/>
