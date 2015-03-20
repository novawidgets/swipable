(function() {
    var Loadmore = Widget.extend({
        /* 默认配置 */
        attrs: {
            dir: 'vertical',    // 可取值vertical, horizontal
            speed: 0.5,         // 滑动速度 
            threshold: 50,      // 拖动范围
            showNextHint: true,        //默认显示往后翻页的提示
            showPreHint: false,     //默认隐藏往前翻页的提示
            mode: 'replace',  //默认replace替换模式，还可取值append添加模式
            page: 1,            //默认页码从第一页开始
            isLastPage: false,  //当前是否最后一页
            hintContent:{
                firstPageText: '当前页为第一页',
                lastPageText: '当前页为最后一页',
                hintLoading: '加载中...',
                nextPageHintDefault: '上拉加载第{$pn}页',
                nextPageHintPrepare: '释放加载第{$pn}页',
                prePageHintDefault: '下拉加载第{$pn}页',
                prePageHintPrepare: '释放加载第{$pn}页'
            }
        },
        /* 初始化 */
        setup: function() {
            this.isLoading = false;
            this.hintContent = this.get('hintContent');
            this.initialized = false;//组件是否初始化
            //初始化上一页提示div
            this.prePageHint = $('<div class="hint pre">'+this.hintContent['firstPageText']+'</div>');
            this.prePageHint.insertBefore(this.$element.children().first());
            //初始化下一页提示divs
            var nText = this.isLastPage?this.hintContent['lastPageText']:(this.hintContent['nextPageHintDefault'].replace('{$pn}',2));
            this.nextPageHint = $('<div class="hint next">'+nText+'</div>');
            this.$element.append(this.nextPageHint);
            this.s = new Swipable({//基于swipable组件
                element: this.$element,
                dir: this.get('dir')
            });
            this.s.$view = this.$element.children();   //因为添加了提示内容，需重新计算 滑动范围，view是滑动区域中的内容
            this.s.min = this._getMin();
            this.s.max = this.get('showPreHint')?0:-this.$element.find('.hint.pre').height();//若显示preHint,则min为负的加载上一页的高度
            if(this.s.min >= 0){// 若容器比内容宽或高，则不做初始化，将添加的提示div隐藏并重新计算高度
                this.$element.find('.hint').hide();     //隐藏提示
                this.s.min = this._getMin();
                this.initialized = false;
                return;
            }
            this._init();//若容器比内容长度小，则初始化，bool值兼容页面使用Ajax请求第一次数据之后的初始化
        },

        _getMin: function(){
            var min = this.s.isVertical ? this.$element.height() - this._getContentSize('height') : this.$element.width() - this._getContentSize('width');
            if(!this.get('showNextHint')){
                min += this.$element.find('.hint.next').height();//加上下一页的高度
            }
            return min;
        },

        _getContentSize: function(dimension){
            var size = 0;
            for(var i = 0; i < this.s.$view.length; i++){
                size += this.s.$view.eq(i)[dimension]();
            }
            return size;
        },

        _init: function(){//初始化方法
            this.s._initEvents();//初始化swipable的事件
            this._initHandlers();//组件的初始化事件方法
            if(!this.get('showPreHint'))this.s._scroll(this.s.max);//当加载上一页不需显示时可隐藏该提示

            $(window).on('resize', this.refresh);
        },

        refresh: function() {
            if(!this.initialized){ //若组件未初始化，则初始化
                this._init();
                this.initialized = true;
            }
            this._changeHintCont('Default');
            this.isLoading = false;
            this.s.min = this._getMin();
            if(this.get('mode') == 'replace'){              //若为替换模式，则滚动至顶部
                this.s._scroll(this.s.max);
            }
            else if(this.get('mode') == 'append' && this.get('page') !== 1){
                var o = this.s.offset - this.$element.height();     //若为append模式，则滚动一屏
                this.s._scroll((this.s.min > o)?this.s.min : o);   //内容不够一屏则滚动至底部
            }
        },

        prePage: function(){
            this.set('page',this.get('page')-1);
            this.set('isLastPage',false);                   //跳转至前一页，则将处理最后一页的flag
            this._changeHintCont('Loading','pre');
        },

        nextPage: function(){
            this.set('page',this.get('page')+1);
            this._changeHintCont('Loading','next');
        },

        _changeHintCont: function(status, flag){
            if(status == 'Loading'){
                if(flag==='pre' && this.get('mode') == 'replace'){
                    this.prePageHint.html(this.hintContent['hintLoading'])
                }else if(flag==='next'){
                    this.nextPageHint.html(this.hintContent['hintLoading']);
                }
                this.isLoading = true;
                return;
            }
            if(this.get('mode') == 'replace'){
                this.prePageHint.html(this.hintContent['prePageHint'+status]);
            }
            this.nextPageHint.html(this.hintContent['nextPageHint'+status]);
            if(status !== 'Loading'){
                if(this.get('mode') == 'replace'){
                    this.prePageHint.html(this.hintContent['prePageHint'+status].replace('{$pn}', this.get('page') - 1));
                }
                this.nextPageHint.html(this.hintContent['nextPageHint'+status].replace('{$pn}', this.get('page')+1));
            }
            if(this.get('isLastPage')){//若当前是最后一页
                this.nextPageHint.html(this.hintContent['lastPageText']);
            }
            if(this.get('page') <= 1 && this.get('mode') == 'replace'){//若当前是第一页
                this.prePageHint.html(this.hintContent['firstPageText']);
            }
        },

        _initHandlers: function() {
            var me = this;
            me.on('change:isLastPage',function(){//外部设置不可加载下一页时修改提示文字
                me._changeHintCont('Default');
            });
            me.s.on('drag',function(e){
                if(!me.isLoading){
                    if(me.s.offset + me.get('threshold') < me.s.min){//向上拉，拖拽超出threshold值
                        me._changeHintCont('Prepare');
                    }else if(me.s.offset < me.s.min){
                        me._changeHintCont('Default');
                    }
                    if(me.s.offset - me.get('threshold') > me.s.max){//向下拉，拖拽超出threshold值
                        me._changeHintCont('Prepare');
                    }else if(me.s.offset > me.s.max){
                        me._changeHintCont('Default');
                    }
                }
            });
            me.s.on('release',function(e) {
                if((me.s.offset + me.get('threshold') < me.s.min) && !me.isLoading && !me.get('isLastPage')){//拖拽超出threshold值，则触发nextPage事件
                    me.nextPage();
                }
                if(me.get('page') > 1 && me.get('mode') == 'replace' && (me.s.offset - me.get('threshold') > me.s.max) && !me.isLoading){//拖拽超出threshold值，则触发prePage事件
                    me.prePage();
                }
            });
        }
    });

    this.Loadmore = Loadmore;
})();