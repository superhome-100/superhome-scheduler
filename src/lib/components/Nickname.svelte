<script>
    import { enhance } from '$app/forms';
    import { user, reservations } from '$lib/stores.js';
    import { toast, Toaster } from 'svelte-french-toast'
    import { getContext } from 'svelte';

    function removeFocus(e) {
        if (e.keyCode == 13) {
            this.blur();
        }
    }

    const updateNickname = async ({ form, data, action, cancel }) => {
        return async ({ result, update }) => {
            switch (result.type) {
                case 'success':
                    $user.nickname = result.data.nickname;
                    $reservations
                        .filter(rsv => rsv.user.id === $user.id)
                        .map(rsv => rsv.user.nickname = $user.nickname);
                    $reservations = [...$reservations];
                    toast.success('Nickname updated');
                    break;
                default:
                    console.error(result);
                    toast.error('Could not update nickname!');
                    break;
            }
        }
    };

</script>

<div class='text-center'>
    Set your display name
</div>
<form
    method='POST'
    action='/?/nickname'
    use:enhance={updateNickname}
    class='text-center'
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
