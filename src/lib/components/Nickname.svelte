<script>
    import { enhance } from '$app/forms';
    import { user } from '$lib/stores.js';
    import { toast, Toaster } from 'svelte-french-toast'

    function submitOnEnter(e) {
        if (e.keyCode == 13) {
            this.form.submit();
        }
    }

    const updateNickname = async ({ form, data, action, cancel }) => {
        return async ({ result, update }) => {
            switch (result.type) {
                case 'success':
                    $user.nickname = result.data.nickname;
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

<form
    method='POST'
    action='/?/nickname'
    class='pl-4'
    use:enhance={updateNickname}
>
    <input type='hidden' name='id' value={$user.id}>
    <input
        type='text'
        class='w-44 text-xs'
        name='nickname'
        placeholder={$user.nickname}
        value={$user.nickname}
        on:keydown={submitOnEnter}
    >
</form>

<Toaster/>
