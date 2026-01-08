<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import NicknameCell from "./NicknameCell.svelte";
  import UserSubscriberTypeCell from "./UserSubscriberTypeCell.svelte";
  import type { Database } from "../../database.types";
  import "./UserManagement.css";

  type UserProfileAuth =
    Database["public"]["Views"]["user_profiles_auth"]["Row"];

  const dispatch = createEventDispatcher();

  export let users: UserProfileAuth[] = [];
  export let stats: any = {};
  export let priceTemplates: Array<{
    name: string;
    description: string | null;
    created_at: string;
  }> = [];

  let filterTxt = "";

  $: filteredUsers = users.filter(
    (u) =>
      filterTxt === "" ||
      (u.name &&
        u.name.toLocaleLowerCase().indexOf(filterTxt.toLocaleLowerCase()) !==
          -1) ||
      (u.nickname &&
        u.nickname
          .toLocaleLowerCase()
          .indexOf(filterTxt.toLocaleLowerCase()) !== -1)
  );

  const handleRefresh = () => {
    dispatch("refresh");
  };

  const toggleUserStatus = (uid: string, currentStatus: string) => {
    dispatch("toggleUserStatus", { uid, currentStatus });
  };

  const toggleUserPrivilege = (uid: string, currentPrivileges: string[]) => {
    dispatch("toggleUserPrivilege", { uid, currentPrivileges });
  };
  const updateNickname = (uid: string, nickname: string) => {
    dispatch("updateNickname", { uid, nickname });
  };
  const updateSubscriberType = (uid: string, price_template_name: string) => {
    dispatch("updateSubscriberType", { uid, price_template_name });
  };
</script>

<div
  class="card bg-base-100 shadow-sm border border-base-300 rounded-xl p-6 mb-8"
>
  <div
    class="sticky top-0 z-20 bg-base-100/95 backdrop-blur-sm -mx-6 px-6 py-2 mb-6 border-b border-base-200 lg:relative lg:top-auto lg:p-0 lg:border-none lg:bg-transparent lg:backdrop-blur-none lg:mb-8"
  >
    <div
      class="header-row flex justify-between items-center px-2 flex-nowrap w-full"
    >
      <h2
        class="header-title flex-1 min-w-0 text-base sm:text-2xl font-semibold text-[#00294C] flex items-center gap-2 sm:gap-6 whitespace-nowrap"
      >
        <span class="truncate max-w-[50vw] sm:max-w-none">User Management</span>
        <div
          class="badge badge-outline gap-2 px-2 py-1 text-xs sm:px-4 sm:py-2 sm:text-sm shrink-0"
        >
          <div class="w-2 h-2 bg-success rounded-full"></div>
          {stats.totalUsers}
          <span class="hidden sm:inline">Total Users</span>
          <span class="inline sm:hidden">Users</span>
        </div>
      </h2>
      <input
        type="text"
        class="badge"
        bind:value={filterTxt}
        placeholder="Filter..."
      />
      <button
        class="btn btn-ghost btn-xs sm:btn-sm gap-2 text-base-content/70 hover:text-base-content px-2 sm:px-3 py-1 whitespace-nowrap shrink-0"
        on:click={handleRefresh}
      >
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
          <path
            d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"
          />
        </svg>
        <span class="hidden sm:inline">Refresh</span>
      </button>
    </div>
  </div>

  <div class="table-container">
    <table class="table w-full">
      <thead>
        <tr>
          <th
            class="text-[#00294C] font-semibold border-b-2 border-base-300 text-left"
            >Name</th
          >
          <th
            class="text-[#00294C] font-semibold border-b-2 border-base-300 text-left"
            >Nickname</th
          >
          <th
            class="text-[#00294C] font-semibold border-b-2 border-base-300 text-left"
            >Subscriber<br />Type</th
          >
          <th
            class="text-[#00294C] font-semibold border-b-2 border-base-300 text-center"
            >Status</th
          >
          <th
            class="text-[#00294C] font-semibold border-b-2 border-base-300 text-center"
            >Privileges</th
          >
          <th
            class="text-[#00294C] font-semibold border-b-2 border-base-300 text-center"
            >LogIn</th
          >
          <th
            class="text-[#00294C] font-semibold border-b-2 border-base-300 text-center"
            >Last Login</th
          >
        </tr>
      </thead>
      <tbody>
        {#each filteredUsers as user}
          <tr
            class="hover:bg-base-200/50 border-b border-base-200 last:border-b-0"
          >
            <td class="text-left">
              <div class="flex items-center gap-2 sm:gap-4">
                <div class="avatar placeholder">
                  {#if user.avatar_url}
                    <img
                      src={user.avatar_url}
                      class="admin_avatar"
                      alt="avatar"
                    />
                  {:else}
                    <div
                      class="bg-primary text-primary-content rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-xs sm:text-sm font-semibold"
                    >
                      {user.name?.charAt(0) || "U"}
                    </div>
                  {/if}
                </div>
                <span
                  class="text-[#00294C] font-medium text-xs sm:text-sm truncate"
                  >{user.name ?? "Unknown"}</span
                >
              </div>
            </td>
            <td class="text-left">
              <NicknameCell
                uid={user.uid}
                value={user.nickname}
                on:save={(e) => updateNickname(e.detail.uid, e.detail.nickname)}
              />
            </td>
            <td class="text-left">
              <UserSubscriberTypeCell
                uid={user.uid}
                value={user.price_template_name}
                templates={priceTemplates}
                on:save={(e) =>
                  updateSubscriberType(
                    e.detail.uid,
                    e.detail.price_template_name
                  )}
              />
            </td>
            <td class="text-center">
              <button
                class="btn btn-xs sm:btn-sm min-w-[60px] sm:min-w-[80px] {user.status ===
                'active'
                  ? 'btn-success'
                  : user.status === 'inactive'
                    ? 'btn-error'
                    : 'btn-outline'}"
                on:click={() => toggleUserStatus(user.uid, user.status)}
                title="Click to toggle status"
              >
                {user.status}
              </button>
            </td>
            <td class="text-center">
              <button
                class="btn btn-xs sm:btn-sm min-w-[60px] sm:min-w-[80px] {user.privileges.includes(
                  'admin'
                )
                  ? 'btn-primary'
                  : 'btn-secondary'}"
                on:click={() => toggleUserPrivilege(user.uid, user.privileges)}
                title="Click to toggle privilege"
              >
                {user.privileges.includes("admin") ? "Admin" : "User"}
              </button>
            </td>
            <td class="text-center">
              <div class="tooltip-container">
              {#if user.auth_provider === "google"}
                <div class="badge badge-outline badge-primary">Google</div>
              {:else if user.auth_provider === "facebook"}
                <div class="badge badge-outline badge-accent">Facebook</div>
              {:else if user.auth_provider === null}
                <div class="badge">-</div>
              {:else}
                <div class="badge">{user.auth_provider}</div>
              {/if}
              <div class="tooltip-text">{user.email}</div>
              </div>
            </td>
            <td class="text-center">
              <div class="badge">
                {#if user.last_sign_in_at}
                  <div class="tooltip-container">
                    {new Date(user.last_sign_in_at).toLocaleDateString()}
                    <div class="tooltip-text">
                      {new Date(user.last_sign_in_at)}
                    </div>
                  </div>
                {:else}
                  never
                {/if}
              </div>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

<style src="./UserManagement.css"></style>
