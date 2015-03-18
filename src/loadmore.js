(function() {

    var Loadmore = Widget.extend({
        /* 默认配置 */
        attrs: {
            dir: 'vertical',    // 可取值vertical, horizontal
            speed: 0.5,         // 滑动速度 
            threshold: 50,      // 拖动范围
            hint: true,        //默认显示提示
            preHint: false,     //默认隐藏往前翻页的提示
            mode: 'html',  //默认html替换模式，还可取值append添加模式
            isLastPage: false,  //当前是否最后一页
            hintContent:{
                firstPageText: '当前页为第1页',
                lastPageText: '当前页为最后1页',
                hintLoading: '加载中...',
                nextPageHintDefault: '上拉加载第{$pn}页',
                nextPageHintPrepare: '释放加载第{$pn}页',
                prePageHintDefault: '下拉加载第{$pn}页',
                prePageHintPrepare: '释放加载第{$pn}页'
            }
        },

        setup: function() {/* 初始化 */
            this.isLoading = false;
            this.page = 1;
            this.mode = this.get('mode');
            this.hintContent = this.get('hintContent');
            this.hint = this.get('hint');
            this.preHint = this.get('preHint');

            //初始化上一页提示div
            this.prePageHint = $('<div class="hint pre">'+this.hintContent['firstPageText']+'</div>');
            this.prePageHint.insertBefore(this.$element.children().first());
            //初始化下一页提示divs
            var nText = this.isLastPage?this.hintContent['lastPageText']:(this.hintContent['nextPageHintDefault'].replace('{$pn}',2));
            this.nextPageHint = $('<div class="hint next">'+nText+'</div>');
            this.$element.append(this.nextPageHint);

            this.hintWrap = this.$element.find('.hint');             //提示容器

            this.preHintHeight = this.$element.find('.hint.pre').height();//计算加载上一页的高度
            this.nextHintHeight = this.$element.find('.hint.next').height();//计算加载上一页的高度

            this.s = new Swipable({//基于swipable组件
                element: this.$element,
                dir: this.get('dir')
            });

            this.s.$view = this.$element.children();   //因为添加了提示内容，需重新计算 滑动范围，view是滑动区域中的内容
            this.s.min = this._getMin();
            this.s.max = this.preHint?0:-this.preHintHeight;

            if(this.s.min >= 0){// 若容器比内容宽或高，则不做初始化，将添加的提示div隐藏并重新计算高度
                this.hintWrap.hide();
                this.s.min = this._getMin();
                return;
            }

            this.init(this.hint);//若容器比内容长度小，则初始化，bool值兼容页面使用Ajax请求第一次数据之后的初始化
        },

        _getMin: function(){
            var min = this.s.isVertical ? this.$element.height() - this._getContentSize('height') : this.$element.width() - this._getContentSize('width');
            if(!this.hint){
                min += this.nextHintHeight;
            }
            return min;
        }
        ,
        _getContentSize: function(dimension){
            var size = 0;
            for(var i = 0; i < this.s.$view.length; i++){
                size += this.s.$view.eq(i)[dimension]();
            }
            return size;
        },

        //初始化方法，外部可调用，页面若使用Ajax初始化第一次数据手动调用
        init: function(showHint){
            var me = this;
            // 是否显示提示
            this.hint = showHint;
            if(this.hint){//若显示提示
                this.nextPageHint.show();
                if(this.mode == 'html'){//若为html模式
                    this.prePageHint.show();
                }
                this.s.min = this._getMin();//重新计算高度
            }
            this.s._initEvents();
            this._initHandlers();//组件的初始化事件方法

            if(!this.preHint)this.s._scroll(this.s.max);//当加载上一页不需显示时可隐藏该提示
            $(window).on('resize', function() {
                me.refresh();
            });
        },

        refresh: function() {
            this._changeHintCont('Default');
            this.isLoading = false;

            this.s.min = this._getMin();

            if(this.s.offset !== undefined && this.s.offset < this.s.max) {
                if(this.s.offset > this.s.max) {
                    this.s._scroll(this.s.max);
                }else if(this.s.offset < this.s.min) {
                    this.s._scroll(this.s.min);
                }
            }
        },

        prePage: function(){
            this.page--;
            this.set('isLastPage',false);//跳转至前一页，则将处理最后一页的flag
            this._changeHintCont('Loading','pre');
        },

        nextPage: function(){
            this.page++;
            this._changeHintCont('Loading','next');
            if(this.mode == 'html'){//若为上一页、下一页的替换模式，则滚动至顶部
                this.s._scroll(this.s.max);
            }
        },

        _changeHintCont: function(status, flag){
            if(status == 'Loading'){
                var hintLoadingCont = this.hintContent['hintLoading'];
                if(flag==='pre' && this.mode == 'html'){
                    this.prePageHint.html(this.hintLoadingCont)
                }else if(flag==='next'){
                    this.nextPageHint.html(hintLoadingCont);
                }
                this.isLoading = true;
                return;
            }
            if(this.mode == 'html'){
                this.prePageHint.html(this.hintContent['prePageHint'+status]);
            }
            this.nextPageHint.html(this.hintContent['nextPageHint'+status]);
            if(status !== 'Loading'){
                if(this.mode == 'html'){
                    this.prePageHint.html(this.hintContent['prePageHint'+status].replace('{$pn}', this.page - 1));
                }
                this.nextPageHint.html(this.hintContent['nextPageHint'+status].replace('{$pn}', this.page+1));
            }
            if(this.get('isLastPage')){//若当前是最后一页
                this.nextPageHint.html(this.hintContent['lastPageText']);
            }
            if(this.page <= 1){//若当前是第一页
                if(this.mode == 'html'){
                    this.prePageHint.html(this.hintContent['firstPageText']);
                }
            }
        },

        _initHandlers: function() {
            var me = this;
            me.on('change:isLastPage',function(){//外部设置不可加载下一页时修改提示文字
                me._changeHintCont('Default');
            });

            me.s.on('drag',function(e){
                if(me.hint){//若显示提示
                        me.nextPageHint.show();
                        if(me.mode == 'html'){//若未禁用加载上一页
                            me.prePageHint.show();
                        }
                    }

                    if(!me.isLoading){
                        if(me.s.offset + me.get('threshold') < me.s.min){//向上拉，拖拽超出threshold值，提示操作
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
                if(me.page > 1 && me.mode == 'html' && (me.s.offset - me.get('threshold') > me.s.max) && !me.isLoading){//拖拽超出threshold值，则触发prePage事件
                    me.prePage();
                }
            });

        },
    });

    this.Loadmore = Loadmore;
})();