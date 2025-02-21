<template>
    <div>
      <BaseLayoutVue :pages-bread-crumb="breadCrumb" :show-tool-bar="true">
        <template v-slot:menuLeft></template>
        <template v-slot:menuRight class="p-3">
          <Btn :text="refEdit == true ? $t('cancel') : $t('edit')" :action="refEdit == true ? 'cancel' : 'update'"
            :primary="false" class="m-3" @click="togglerefEdit"></Btn>
        </template>
        <template v-slot:default>
          <div class="space-y-8 ml-3">
            <div class="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-4">
              <div class="photo">
                <div>
                  <div>
                    <h3 class="text-lg leading-6 font-medium text-gray-900">
                      {{ $t('users.profile') }}
                    </h3>
                    <p class="mt-1 text-sm text-gray-500"></p>
                  </div>
                  <div class="mt-6 grid grid-cols-6 gap-y-6 gap-x-4 h-32">
                    <div class="col-span-4">
                      <img v-if="refUser.photo != null" class="h-32 rounded-full ring-4 ring-white sm:h-32 sm:w-32"
                        :src="refUser.photo.url" />
                      <span v-if="refUser.photo == null"
                        class="inline-block h-32 rounded-full overflow-hidden bg-gray-100">
                        <svg class="h-full text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                          <path
                            d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <form class="m-3 space-y-8" action="#" method="POST" @submit.prevent="update">

            <div>
              <div class="mt-6 grid grid-cols-6 gap-y-6 gap-x-4">
                <div class="col-span-6 md:col-span-2">
                  <InputField :title="$t('users.name')" v-model="refUser!.name" :isRequired="false" :isDisabled="true"
                    :type="FieldType.TEXT"></InputField>
                </div>
              </div>
              <div class="mt-6 grid grid-cols-6 gap-y-6 gap-x-4">
                <div class="col-span-6 md:col-span-2">
                  <InputField :title="$t('users.email')" v-model="refUser!.email" :isRequired="false"
                    :isDisabled="true" :type="FieldType.EMAIL"></InputField>
                </div>
              </div>
              <div class="mt-6 grid grid-cols-6 gap-y-6 gap-x-4">
                <div class="col-span-6 md:col-span-2">
                  <InputField :title="$t('users.number')" v-model="refUser!.number" :isRequired="false" :isDisabled="true"
                    :type="FieldType.TEXT"></InputField>
                </div>
              </div>
              <div class="mt-6 grid grid-cols-6 gap-y-6 gap-x-4">
                <div class="col-span-6 md:col-span-2">
                  <InputField
                    :title="$t('users.tags')"
                    v-model="refTags"
                    :isRequired="false"
                    :isDisabled="true"
                    :type="FieldType.TEXT"></InputField>
                </div>
              </div>
              <div class="mt-6 grid grid-cols-6 gap-y-6 gap-x-4">
                <div class="col-span-6 md:col-span-1">
                  <InputField :title="$t('users.language')" v-model="refUser.lang" :choices="languages"
                    :values="languages" :isRequired="false" :isDisabled="true" :type="FieldType.SELECT"></InputField>
                </div>
              </div>
              <div class="mt-6 grid grid-cols-6 gap-y-6 gap-x-4">
                <div class="col-span-6 md:col-span-2">
                    <InputField
                        :title="$t('users.role')"
                        v-model="refRole"
                        :isRequired="false"
                        :isDisabled="!refEdit"
                        :choices="[$t('users.editorRole'),$t('users.userRole')]"
                        :values="[2,1]"
                        :type="FieldType.SELECT"
                    ></InputField>
                </div>
              </div>
              <div class="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                <div class="sm:col-span-2">
                  <Btn v-if="refEdit" :text="$t('save')" :primary="true" class=""></Btn>
                </div>
              </div>
            </div>
          </form>
        </template>
      </BaseLayoutVue>
    </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { inject, ref } from 'vue';
import BaseLayoutVue from '../../layouts/BaseLayout.vue'
import { useRouter, useRoute } from 'vue-router'
import Store from './../../store/Store'
import UserModel from './../../Models/UserModel';
import Btn from './../../components/Btn.vue'
import InputField from './../../components/InputField.vue';
import FieldType from './../../Contracts/FieldType';
import { BaseController, ModelCollection } from './../../Classes/BaseController'
import { RouteService } from '../../Classes/RouteService'
import ComfirmPopup from '../../components/ComfirmPopup.vue'
import languages from '../../Contracts/languages';
import ProjectModel from '../../Models/ProjectModel';

const router = useRouter()
const route = useRoute()
const store: Store = inject('store')!
const routePrefix = '/projects'
const breadCrumb = ref([{ name: 'Projects', href: '/projects' }])
const { t } = useI18n()
const isOpen = ref(false)

const refActivated = ref(false)
const refAdmin = ref(false)
const refEdit = ref(false)

const refUser = ref(new UserModel())
const refRole = ref(0)
const refTags = ref('')
const refProject = ref(new ProjectModel())
const refProjectCollection = ref(new ModelCollection<ProjectModel>())


const edit = ref(false)

const crudController = new BaseController<ProjectModel>(
    '',
    [{ name: 'photo' }],
    refProject.value,
    store.authUser.token['token'],
)

crudController.setRoutePrefix(routePrefix)


//let imageToUpload = crudController.getFileList('photo')

async function init() {
    await RouteService.getProjectInfos(route)
    refProject.value = await crudController.show(Number(route.params.id))

    refUser.value = <UserModel>refProject.value.users.find(element => element.id == Number(route.params.userId))

    refRole.value =refUser.value.meta.pivot_role!=undefined?refUser.value.meta.pivot_role:0
    refTags.value =refUser.value.meta.pivot_tags!=undefined?refUser.value.meta.pivot_tags:''

    breadCrumb.value = [{ name: 'Projects', href: '/projects' }, { name: store.currentProject.name, href: routePrefix + '/' + route.params.id }, { name: t('navigation.users'), href: routePrefix + '/' + route.params.id + '/users' }, { name: refUser.value.name, href: routePrefix + '/' + route.params.id + '/users' + route.params.userId }]

}
async function update(){
    const data = {role:refRole.value, tags:refTags.value}
    await crudController.patch(route.params.id + '/users/' + refUser.value.id,data)
    router.push(routePrefix + '/' +  route.params.id +'/users')
}
function togglerefEdit() {
    refEdit.value = !refEdit.value
    if (refEdit.value == false) {
        init()
    }
}
async function remove() {
    isOpen.value = true
}
async function removeConfirmation() {
    isOpen.value = false
    await crudController.delete(route.params.id + '/users/' + refUser.value.id)
    router.push(routePrefix + '/' +  route.params.id +'/users')
}

init()
</script>
