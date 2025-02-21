import Project from "../Models/Project"
import Device from "../../Datas/Models/Device"
import Tag from "../../Datas/Models/Tag"
import Dashboard from "../../Datas/Models/Dashboard"
import Drive from "@ioc:Adonis/Core/Drive"
import { string } from "@ioc:Adonis/Core/Helpers"
import TagsService from "App/Modules/Datas/Services/TagsService"
import Logger from '@ioc:Adonis/Core/Logger'

export default class ImportConfService {

  private _devices: Device[]
  private _tags: Tag[]
  private _dashboards: Dashboard[]
  private _project:Project

  set project(value:Project) {
    this._project=value
  }
  get project(): Project{
    return this._project
  }

  public get devices(): Device[] {
    return this._devices
  }
  public set devices(value: Device[]) {
    this._devices = value
  }

  public get tags(): Tag[] {
    return this._tags
  }
  public set tags(value: Tag[]) {
    this._tags = value
  }

  public get dashboards(): Dashboard[] {
    return this._dashboards
  }
  public set dashboards(value: Dashboard[]) {
    this._dashboards = value
  }

  /**
   *
   * Initialise models to export (devices, tags and dashboards)
   *
   * @param projectId number
   *
   */
  private async init(projectId:number):Promise<void> {
    this.project = await Project.query().where('id', projectId).firstOrFail()
  }

  /**
   *
   * Open file and parse models data
   *
   */
  private async loadModels():Promise<void> {
    try {
      let file = await Drive.get('import/' + string.camelCase(this.project.name) + '.json')
      const formatedExport = JSON.parse(file.toString())
      this.devices = formatedExport.devices
      this.tags = formatedExport.tags
      this.dashboards = formatedExport.dashboards
    } catch (error) {
      Logger.error('* Load model error:')
    }
    Logger.info('* Load model: OK')
  }

  /**
   *
   * Save exported datas to Drive storage
   *
   *
   */
  private async save():Promise<void>{
    try {
      const dashboardIdMapping = await this.importDashboards(this.dashboards)
      const devicesIdMapping = await this.importDevices(this.devices, dashboardIdMapping)
      await this.importTags(this.tags, devicesIdMapping)
      Logger.info('* Import conf completed')
      this.end()
    } catch (error) {
      this.end()
      Logger.error(error)
      Logger.info('* Import conf failed')
    }
  }

  /**
   * Import devices in database from .jon imported object
   *
   * @param devices
   * @returns Promise<number[]> Mapping of the old and new table id
   */
  protected async importDevices( devices: {}[], dashboardIdMapping:number[] ): Promise<number[]> {
    try {
      const idMapping: number[] = []
      for (const device of devices) {
        device['project_id'] = this.project.id
        const oldId = device['id']
        const oldDashboardId = device['dashboard_id']
        let projectDevice = await Device.query().where('name', device['name']).andWhere('project_id',this.project.id).first()
        delete (device['id'])
        delete (device['updated_at'])
        delete (device['created_at'])
        device['dashboard_id']=dashboardIdMapping[oldDashboardId]
        if(projectDevice!=null) {
          delete (device['namespace'])
          delete (device['client_id'])
          await projectDevice.merge(device).save()
        } else {
          device['namespace'] = await this.findNamespace(device['namespace'])
          device['client_id'] = device['namespace']
          projectDevice = new Device()
          await projectDevice.merge(device).save()
        }

        idMapping[oldId] = projectDevice.id

      }
      Logger.info('* Import device model: OK')
      return idMapping
    } catch (error) {
      throw("Device import Error: \n\n" + error);
    }

  }
  /**
   *
   * Search if namespace is unique
   *
   */
  protected async findNamespace(namespace:string):Promise<string> {
    if (await Device.query().where('namespace',namespace).select('namespace').first() != null) {
      const match = namespace.match(/(\d+)$/)
      if (match!=null) {
        const prefix = namespace.slice(0, namespace.length - match[1].toString().length)
        return this.findNamespace(prefix + String(parseInt(match[1],10) + 1 ))
      } else {
        return this.findNamespace(namespace +'_1' )
      }
    }
    return  namespace
  }
  /**
   * Import tags in database from .jon imported object
   *
   * @param tags
   * @param idMapping Mapping of the old and new table device_id
   */
  protected async importTags( tags: {}[], idMapping: number[]) {
    try {
      const tagService = new TagsService(this.project)

      for (const tag of tags) {
        tag['project_id'] = this.project.id
        tag['device_id'] = idMapping[tag['device_id']]
        let projectTag = await Tag.query().where('name', tag['name']).andWhere('project_id',this.project.id).first()
        delete (tag['id'])
        delete (tag['compact'])
        delete (tag['updated_at'])
        delete (tag['created_at'])
        if(projectTag!=null) {
          await projectTag.merge(tag).save()
          await tagService.createGts([projectTag])
        } else {
          projectTag = new Tag()
          await projectTag.merge(tag).save()
          await tagService.createGts([projectTag])
        }
      }
      Logger.info('* Import tag model: OK')
    } catch (error) {
      throw("Tag import Error: \n\n" + error);
    }
  }

  /**
   * Import dashboards in database from .jon imported object
   *
   * @param dashboards
   * @returns Promise<boolean>
   */
   protected async importDashboards(dashboards: {}[]): Promise<number[]> {
    try {
      const idMapping: number[] = []
      for (const dashboard of dashboards) {
        let projectDashboard = await Dashboard.query().where('name', dashboard['name']).andWhere('project_id',this.project.id).first()
        dashboard['project_id'] = this.project.id
        const oldId = dashboard['id']

        delete (dashboard['id'])
        delete (dashboard['img_bg'])
        delete (dashboard['updated_at'])
        delete (dashboard['created_at'])
        if(projectDashboard!=null) {
          await projectDashboard.merge(dashboard).save()
        } else {
          projectDashboard = new Dashboard()
          await projectDashboard.merge(dashboard).save()
        }


        idMapping[oldId] = projectDashboard.id
      }
      Logger.info('* Import dashboard model: OK')
      return idMapping
    } catch (error) {
      throw("Dashboard import Error: \n\n" + error);
    }

  }

  /**
   *
   * Export project conf to Drive storage
   *
   * @param projectId
   *
   */
  public async import(projectId:number):Promise<void>{
    await this.init(projectId)
    await this.loadModels()
    await this.save()
  }
  /**
   *
   * Change the importExportCmd status to 0
   *
   */
  public async end():Promise<boolean> {
    this.project.ImportExportCmd=0
    await this.project.save()
    return true
  }
}
